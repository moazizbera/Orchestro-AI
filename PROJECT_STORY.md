## Inspiration

Orchestro AI was inspired by a simple but costly real-world problem: most people are quietly losing money through recurring subscriptions they no longer use, rarely review, or forget to cancel. Financial tools often stop at showing transactions or dashboards, but they do not help users move from awareness to action. We wanted to build an agentic system that not only detects waste, but also helps users decide what to do next, prepares the follow-through, and makes the savings process feel structured instead of overwhelming.

We were also motivated by the idea that personal finance assistants should go beyond chatbot experiences. For this hackathon, we wanted to build something that behaves more like an orchestration system: multiple agents working together on a real user goal, using partner integrations and producing outputs that are immediately useful.

## What it does

Orchestro AI is a multi-agent subscription savings assistant. It helps users analyze recurring subscriptions, identify waste, and turn those insights into concrete next steps.

The system can:
- detect unused, overlapping, or high-cost subscriptions
- estimate monthly and annual savings opportunities
- generate action plans such as cancellation or downgrade steps
- prepare negotiation playbooks for provider conversations
- schedule follow-up reminders so the user actually completes the plan
- build conservative, balanced, and aggressive savings scenarios
- present the results in a judge-friendly report with export and demo-script support

Instead of stopping at “here is your spending data,” Orchestro AI moves through the full flow from analysis to action to follow-through.

## How we built it

We built Orchestro AI as a full-stack multi-agent application.

On the backend, we used FastAPI with a modular agent architecture. The orchestration layer routes a request to specialized agents, including:
- a finance agent for subscription waste detection
- an action agent for next-step generation
- a negotiation agent for provider retention and downgrade playbooks
- a calendar agent for follow-up scheduling
- a scenario agent for savings-plan strategy generation

We used MongoDB as the primary persistence layer and integrated the MongoDB MCP server to align with the partner track. Execution history, request context, outputs, and impact metrics are stored so the app can support replay, history, and evidence-based demos.

On the frontend, we used React and Vite to build an interactive audit workspace. We added:
- a clean multi-step workflow
- permission controls for agent access
- a runtime proof panel for provider and MongoDB MCP visibility
- a full-screen report viewer
- a judge report exporter
- a demo script generator
- a submission mode with a focused judge scenario and checklist

The architecture was designed to be Gemini-preferred and Google Cloud-aligned, while still remaining functional in local fallback mode so the full experience could be tested and demonstrated reliably during development.

## Challenges we ran into

One of the biggest challenges was balancing ambition with reliability. A multi-agent product can quickly become slow or fragile if every step depends on live model calls. We had to tighten orchestration time budgets, add deterministic fallback paths, and make sure the demo never became unusable because one provider was slow or unavailable.

Another challenge was aligning the product with hackathon requirements while still building something genuinely useful. We needed the app to show:
- real multi-step agent behavior
- partner-track integration
- visible tool use
- actionable outputs
- a polished demo flow

We also had to deal with practical runtime issues such as local model latency, stale server restarts, evolving response contracts, and keeping the frontend and backend aligned as the agent system expanded from two agents to five.

Finally, we had to design the submission story honestly. The architecture is Gemini-ready, but we also needed a truthful and stable fallback path in case cloud credits or credentials were delayed.

## Accomplishments that we're proud of

We are proud that Orchestro AI became more than a prototype chatbot. It now behaves like a real agent system with visible orchestration, multiple specialized roles, and outputs that support real user action.

Some accomplishments we are especially proud of:
- building a five-agent workflow around one concrete financial use case
- integrating MongoDB MCP in a way that is visible and demoable
- creating deterministic fallback behavior so the product remains usable under real constraints
- turning the app into a judge-friendly experience with submission mode, runtime proof, checklist, exportable reports, and demo narration support
- designing a product flow that feels practical: detect waste, recommend action, support follow-through, and offer strategic savings paths

We are also proud that the product stayed coherent as it expanded. Each new agent added a distinct layer of value instead of feeling redundant.

## What we learned

We learned that reliability is part of intelligence. In an agent system, it is not enough for the model to be clever; the overall workflow must stay bounded, explainable, and useful when conditions are imperfect.

We also learned that hackathon demos are strongest when the judging story is built directly into the product. Instead of relying only on spoken explanation, we added runtime proof, scenario planning, judge exports, and a submission-focused interface so the app itself communicates why it matters.

On the technical side, we learned how quickly orchestration complexity grows once multiple agents share context and outputs. That pushed us to think more carefully about contracts, fallback behavior, and how to keep the system modular while still presenting one clean user experience.

## What's next for Orchestro AI

The next step for Orchestro AI is to complete the Gemini-first submission path on Google Cloud and extend the system from a strong demo into a more production-ready financial assistant.

Planned next steps include:
- activating live Gemini-backed orchestration once credits and credentials are available
- strengthening Google Cloud deployment and operational readiness
- expanding the range of financial agents and planning workflows
- deepening the MongoDB-backed memory and analytics layer
- improving personalization so the savings recommendations adapt to user priorities and risk tolerance
- turning the current report and scenario system into an even more proactive financial command center

Our long-term goal is for Orchestro AI to help users not only understand where their recurring money is going, but confidently act on it and keep improving over time.