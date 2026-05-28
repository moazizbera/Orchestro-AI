import asyncio
import json
import logging
import os
import shlex
import shutil
from typing import Any

logger = logging.getLogger(__name__)


def _parse_command(command: str) -> list[str]:
    parts = shlex.split(command, posix=False)
    if not parts:
        return parts

    executable = parts[0]
    resolved = shutil.which(executable)
    if resolved:
        parts[0] = resolved
        return parts

    if os.name == "nt" and not executable.lower().endswith((".exe", ".cmd", ".bat")):
        resolved = shutil.which(f"{executable}.cmd") or shutil.which(f"{executable}.exe")
        if resolved:
            parts[0] = resolved

    return parts


def _normalize_ejson(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_ejson(item) for item in value]
    if not isinstance(value, dict):
        return value

    if set(value.keys()) == {"$oid"}:
        return value["$oid"]
    if set(value.keys()) == {"$date"}:
        return value["$date"]
    if set(value.keys()) == {"$numberInt"}:
        return int(value["$numberInt"])
    if set(value.keys()) == {"$numberLong"}:
        return int(value["$numberLong"])
    if set(value.keys()) == {"$numberDouble"}:
        return float(value["$numberDouble"])

    return {key: _normalize_ejson(item) for key, item in value.items()}


class MongoMCPClient:
    def __init__(
        self,
        command: str,
        connection_string: str,
        read_only: bool = False,
        disabled_tools: str = "",
        timeout_seconds: float = 12.0,
    ) -> None:
        self._command = command
        self._connection_string = connection_string
        self._read_only = read_only
        self._disabled_tools = disabled_tools
        self._timeout_seconds = timeout_seconds
        self._process: asyncio.subprocess.Process | None = None
        self._request_id = 0
        self._lock = asyncio.Lock()
        self._tools: dict[str, dict[str, Any]] = {}
        self.last_error: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._command and self._connection_string)

    async def warmup(self) -> bool:
        if not self.enabled:
            return False

        try:
            await asyncio.wait_for(self._ensure_started(), timeout=self._timeout_seconds)
            await asyncio.wait_for(self.list_tools(refresh=True), timeout=self._timeout_seconds)
            self.last_error = None
            return True
        except asyncio.TimeoutError:
            self.last_error = f"Warmup timed out after {self._timeout_seconds:.1f}s"
            logger.warning(
                "MongoDB MCP warmup timed out after %.1fs. Falling back to direct Motor access.",
                self._timeout_seconds,
            )
            await self.close()
            return False
        except Exception as exc:
            self.last_error = str(exc)
            logger.warning("MongoDB MCP unavailable (%s). Falling back to direct Motor access.", exc)
            await self.close()
            return False

    async def close(self) -> None:
        if self._process is None:
            return

        process = self._process
        self._process = None

        if process.returncode is None:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=5)
            except asyncio.TimeoutError:
                process.kill()

    async def list_tools(self, refresh: bool = False) -> dict[str, dict[str, Any]]:
        if self._tools and not refresh:
            return self._tools

        result = await self._request("tools/list", {})
        tools = result.get("tools", []) if isinstance(result, dict) else []
        self._tools = {tool.get("name", ""): tool for tool in tools if tool.get("name")}
        return self._tools

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        await self._ensure_started()
        await self.list_tools()

        result = await self._request(
            "tools/call",
            {
                "name": name,
                "arguments": arguments,
            },
        )

        if result.get("isError"):
            raise RuntimeError(f"MongoDB MCP tool failed: {name}")

        if "structuredContent" in result:
            return _normalize_ejson(result["structuredContent"])

        content = result.get("content", [])
        if not content:
            return None

        texts = [item.get("text", "") for item in content if item.get("type") == "text"]
        joined = "\n".join(part for part in texts if part).strip()
        if not joined:
            return None

        try:
            return _normalize_ejson(json.loads(joined))
        except json.JSONDecodeError:
            return joined

    async def find(
        self,
        database: str,
        collection: str,
        filter_query: dict[str, Any],
        projection: dict[str, Any] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        result = await self.call_tool(
            "find",
            {
                "database": database,
                "collection": collection,
                "filter": filter_query,
                "projection": projection or {},
                "limit": limit,
            },
        )
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            for key in ("documents", "results", "items"):
                value = result.get(key)
                if isinstance(value, list):
                    return value
        return []

    async def aggregate(
        self,
        database: str,
        collection: str,
        pipeline: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        result = await self.call_tool(
            "aggregate",
            {
                "database": database,
                "collection": collection,
                "pipeline": pipeline,
            },
        )
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            for key in ("documents", "results", "items"):
                value = result.get(key)
                if isinstance(value, list):
                    return value
        return []

    async def insert_many(self, database: str, collection: str, documents: list[dict[str, Any]]) -> Any:
        return await self.call_tool(
            "insert-many",
            {
                "database": database,
                "collection": collection,
                "documents": documents,
            },
        )

    async def update_many(
        self,
        database: str,
        collection: str,
        filter_query: dict[str, Any],
        update: dict[str, Any],
    ) -> Any:
        return await self.call_tool(
            "update-many",
            {
                "database": database,
                "collection": collection,
                "filter": filter_query,
                "update": update,
            },
        )

    async def _ensure_started(self) -> None:
        if self._process is not None and self._process.returncode is None:
            return

        command = _parse_command(self._command)
        env = os.environ.copy()
        env.update(
            {
                "MDB_MCP_CONNECTION_STRING": self._connection_string,
                "MDB_MCP_READ_ONLY": "true" if self._read_only else "false",
                "MDB_MCP_TRANSPORT": "stdio",
                "MDB_MCP_DISABLED_TOOLS": self._disabled_tools,
                "MDB_MCP_LOGGERS": "stderr",
                "MDB_MCP_TELEMETRY": "disabled",
            }
        )

        self._process = await asyncio.create_subprocess_exec(
            *command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        asyncio.create_task(self._log_stderr())

        response = await self._request(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "orchestro-ai",
                    "version": "1.0.0",
                },
            },
        )
        if not isinstance(response, dict):
            raise RuntimeError("MongoDB MCP initialize returned an invalid response")

        await self._notify("notifications/initialized", {})
        logger.info("MongoDB MCP connected via command: %s", self._command)

    async def _notify(self, method: str, params: dict[str, Any]) -> None:
        message = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        }
        await self._write_message(message)

    async def _request(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            self._request_id += 1
            request_id = self._request_id
            message = {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": method,
                "params": params,
            }
            await self._write_message(message)

            while True:
                response = await asyncio.wait_for(self._read_message(), timeout=self._timeout_seconds)
                if response.get("id") != request_id:
                    continue
                if "error" in response:
                    raise RuntimeError(str(response["error"]))
                return response.get("result", {})

    async def _write_message(self, message: dict[str, Any]) -> None:
        if self._process is None or self._process.stdin is None:
            raise RuntimeError("MongoDB MCP process is not running")

        payload = json.dumps(message).encode("utf-8")
        header = f"Content-Length: {len(payload)}\r\n\r\n".encode("ascii")
        self._process.stdin.write(header + payload)
        await self._process.stdin.drain()

    async def _read_message(self) -> dict[str, Any]:
        if self._process is None or self._process.stdout is None:
            raise RuntimeError("MongoDB MCP process is not running")

        headers: dict[str, str] = {}
        while True:
            line = await self._process.stdout.readline()
            if not line:
                raise RuntimeError("MongoDB MCP process closed its stdout stream")
            if line in (b"\r\n", b"\n"):
                break
            decoded = line.decode("ascii").strip()
            if ":" not in decoded:
                continue
            key, value = decoded.split(":", 1)
            headers[key.lower()] = value.strip()

        length = int(headers.get("content-length", "0"))
        if length <= 0:
            raise RuntimeError("MongoDB MCP response omitted Content-Length")

        payload = await self._process.stdout.readexactly(length)
        return json.loads(payload.decode("utf-8"))

    async def _log_stderr(self) -> None:
        process = self._process
        if process is None or process.stderr is None:
            return

        while True:
            line = await process.stderr.readline()
            if not line:
                return
            logger.debug("mongodb-mcp-server: %s", line.decode("utf-8", errors="replace").rstrip())