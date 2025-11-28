#
# Gig worker financial coach bot using Pipecat Flows
#
# Copyright (c) 2024-2025
# SPDX-License-Identifier: BSD 2-Clause License
#

"""
A dynamic financial coaching flow example for Pipecat Flows.

This example implements a voice-based financial coach for gig workers
(ride-hailing drivers, delivery partners, etc.). The conversation is
open-ended: users can vent, ask for advice, share earnings/expenses,
or talk about goals, and the assistant routes to the right "skill"
dynamically.

The flow handles:

1. Entry / catch-all:
   - Listen to whatever the user says and decide what to do next
     (daily advice, concept explanation, stress support, goal setting).

2. Daily advice:
   - When user has shared income (and optionally expenses), compute a
     simple saving suggestion and store it in state.

3. Concept teaching:
   - Explain basic financial literacy topics (saving habits, emergency fund,
     budgeting rules, compounding, simple long-term investing principles).

4. Stress / emotional support:
   - When user is stressed or venting, respond empathetically and suggest
     a tiny, realistic step.

5. Goal setting:
   - When user mentions a goal (e.g., buy a bike, pay off loan, save for child),
     record it and connect it to daily actions.

Global functions:
   - record_earning(amount)
   - record_expense(amount)

Multi-LLM Support:
Set LLM_PROVIDER environment variable to choose your LLM provider.
Supported: openai (default), anthropic, google, aws

Requirements (same as other Pipecat examples):
- CARTESIA_API_KEY (for TTS)
- DEEPGRAM_API_KEY (for STT)
- DAILY_API_KEY (for transport)
- LLM API key (varies by provider - see env.example)
"""

import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.sarvam.tts import SarvamTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService, LiveOptions
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams
from pipecat.transports.websocket.fastapi import FastAPIWebsocketParams
from pipecat.utils.text.markdown_text_filter import MarkdownTextFilter

from utils import create_llm  # same helper used in the official examples

from pipecat_flows import (
    FlowArgs,
    FlowManager,
    FlowResult,
    FlowsFunctionSchema,
    NodeConfig,
)

load_dotenv(override=True)

# --------------------------------------------------------------------
# Transport configuration (same pattern as food-ordering example)
# --------------------------------------------------------------------

transport_params = {
    "daily": lambda: DailyParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        vad_analyzer=SileroVADAnalyzer(),
    ),
    "twilio": lambda: FastAPIWebsocketParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        vad_analyzer=SileroVADAnalyzer(),
    ),
    "webrtc": lambda: TransportParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        vad_analyzer=SileroVADAnalyzer(),
    ),
}

# --------------------------------------------------------------------
# Type definitions for flow results
# --------------------------------------------------------------------


class SavingsAdviceResult(FlowResult):
    income: float
    expenses: float
    suggested_saving: float


class ConceptResult(FlowResult):
    topic: str


class GoalResult(FlowResult):
    goal: str
    target_amount: float | None = None


class DeliveryEstimateResult(FlowResult):
    # Optional: you can still give a generic “financial journey” estimate,
    # or repurpose this for something else. Kept for structure parity.
    time: str


# --------------------------------------------------------------------
# Helper / pre-actions
# --------------------------------------------------------------------


async def log_session_context(action: dict, flow_manager: FlowManager) -> None:
    """Example pre-action: log that we're starting a coaching turn."""
    logger.info("Starting a financial coaching turn with current state: {}", flow_manager.state)


# --------------------------------------------------------------------
# Node creation functions (flow states)
# --------------------------------------------------------------------


def create_entry_node() -> NodeConfig:
    """
    Entry / catch-all node.

    The LLM reads the user's message and decides which function to call:
    - route_to_daily_advice
    - route_to_concept_teaching
    - route_to_stress_support
    - route_to_goal_setting
    """

    async def route_to_daily_advice(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[None, NodeConfig]:
        return None, create_daily_advice_node()

    async def route_to_concept_teaching(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[None, NodeConfig]:
        return None, create_concept_node()

    async def route_to_stress_support(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[None, NodeConfig]:
        return None, create_stress_node()

    async def route_to_goal_setting(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[None, NodeConfig]:
        return None, create_goal_node()

    route_daily_func = FlowsFunctionSchema(
        name="route_to_daily_advice",
        handler=route_to_daily_advice,
        description=(
            "Use this when the user has talked about earnings, spending, or money for today "
            "and you want to give them concrete daily saving advice."
        ),
        properties={},
        required=[],
    )

    route_concept_func = FlowsFunctionSchema(
        name="route_to_concept_teaching",
        handler=route_to_concept_teaching,
        description=(
            "Use this when the user asks 'how', 'what is', or wants an explanation of financial concepts "
            "like saving, budgeting, emergency fund, or compounding."
        ),
        properties={},
        required=[],
    )

    route_stress_func = FlowsFunctionSchema(
        name="route_to_stress_support",
        handler=route_to_stress_support,
        description=(
            "Use this when the user sounds stressed, tired, frustrated, or is venting about money, work, or life."
        ),
        properties={},
        required=[],
    )

    route_goal_func = FlowsFunctionSchema(
        name="route_to_goal_setting",
        handler=route_to_goal_setting,
        description=(
            "Use this when the user mentions a clear goal like buying a vehicle, paying off a loan, "
            "saving for family, or building a safety net."
        ),
        properties={},
        required=[],
    )

    return NodeConfig(
        name="entry",
        role_messages=[
            {
                "role": "system",
                "content": (
                    "You are a friendly, practical financial coach for gig workers in India, "
                    "like ride-hailing drivers and delivery partners.\n\n"
                    "Your job is to help them feel a little more in control of their money each day. "
                    "They can talk to you about anything: earnings, expenses, stress, family goals.\n\n"
                    "You must ALWAYS use the available functions to progress the conversation.\n"
                    "This is a voice conversation; keep replies short, clear, and conversational. "
                    "Avoid emojis and special characters."
                ),
            }
        ],
        task_messages=[
            {
                "role": "system",
                "content": (
                    "For this step, listen carefully to what the user is saying. Decide what they need most "
                    "RIGHT NOW: daily advice, concept explanation, stress support, or goal setting.\n\n"
                    "Then call ONE of the routing functions:\n"
                    "- route_to_daily_advice\n"
                    "- route_to_concept_teaching\n"
                    "- route_to_stress_support\n"
                    "- route_to_goal_setting\n\n"
                    "Do not answer everything here. Use the functions to move into the right skill."
                ),
            }
        ],
        pre_actions=[
            {
                "type": "function",
                "handler": log_session_context,
            }
        ],
        functions=[
            route_daily_func,
            route_concept_func,
            route_stress_func,
            route_goal_func,
        ],
    )


def create_daily_advice_node() -> NodeConfig:
    """Node for computing simple daily savings advice based on earnings/expenses."""

    async def compute_savings_advice(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[SavingsAdviceResult, NodeConfig]:
        income = float(args["income"])
        expenses = float(args.get("expenses", 0.0))

        # Simple rule-of-thumb: suggest saving ~20% of net income if possible.
        net = max(0.0, income - expenses)
        suggested_saving = round(net * 0.20, 2)

        # Store into flow state for later reference
        finance_state = flow_manager.state.setdefault("finance", {})
        finance_state["last_income"] = income
        finance_state["last_expenses"] = expenses
        finance_state["last_suggested_saving"] = suggested_saving

        result = SavingsAdviceResult(
            income=income,
            expenses=expenses,
            suggested_saving=suggested_saving,
        )

        # After giving advice, go back to entry to continue open conversation
        return result, create_entry_node()

    compute_savings_func = FlowsFunctionSchema(
        name="compute_savings_advice",
        handler=compute_savings_advice,
        description=(
            "Use this when the user has shared their earnings for today (and maybe expenses). "
            "Compute a simple suggested saving amount and then return to open conversation."
        ),
        properties={
            "income": {
                "type": "number",
                "description": "Total money the user earned today.",
            },
            "expenses": {
                "type": "number",
                "description": "Approximate amount spent today (petrol, food, EMI, etc).",
            },
        },
        required=["income"],
    )

    return NodeConfig(
        name="daily_advice",
        task_messages=[
            {
                "role": "system",
                "content": (
                    "You are now focusing on daily money decisions. Ask for today's earnings and, if needed, "
                    "rough expenses. Then call compute_savings_advice with numbers.\n\n"
                    "When you speak to the user, be concrete:\n"
                    "- Mention their income\n"
                    "- Mention their spends (if known)\n"
                    "- Suggest a realistic saving amount for today\n"
                    "Keep it short and supportive, not judgemental."
                ),
            }
        ],
        functions=[compute_savings_func],
    )


def create_concept_node() -> NodeConfig:
    """Node for explaining basic financial literacy concepts."""

    async def register_concept(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[ConceptResult, NodeConfig]:
        topic = args["topic"]

        # Optionally track which topics were explained
        history = flow_manager.state.setdefault("concepts_explained", [])
        history.append(
            {
                "topic": topic,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        result = ConceptResult(topic=topic)

        # After teaching, return to entry for free-form follow-up
        return result, create_entry_node()

    register_concept_func = FlowsFunctionSchema(
        name="register_concept",
        handler=register_concept,
        description=(
            "Use this when you have explained a financial concept like emergency fund, "
            "saving habits, budgeting rules, or compounding, and want to log what you covered."
        ),
        properties={
            "topic": {
                "type": "string",
                "description": "The core concept you just explained (e.g., 'emergency fund').",
            }
        },
        required=["topic"],
    )

    return NodeConfig(
        name="concept_teaching",
        task_messages=[
            {
                "role": "system",
                "content": (
                    "You are explaining a financial concept the user asked about. "
                    "Keep it very simple, relate it to daily life of a gig worker, and avoid jargon.\n\n"
                    "Examples of topics:\n"
                    "- emergency fund (3–6 months of basic expenses)\n"
                    "- small daily saving habits\n"
                    "- basic budgeting ideas (like fixed vs flexible costs)\n"
                    "- how compounding works over years\n\n"
                    "After explaining, call register_concept with the topic name and then let the user react "
                    "when we return to entry."
                ),
            }
        ],
        functions=[register_concept_func],
    )


def create_stress_node() -> NodeConfig:
    """Node for stress / emotional support around money."""

    async def acknowledge_stress(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[None, NodeConfig]:
        # We don't need to store anything special here, but we could mark that
        # the user had a tough day.
        mood_log = flow_manager.state.setdefault("mood_log", [])
        mood_log.append(
            {
                "type": "stress",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        # Go back to entry after a supportive response
        return None, create_entry_node()

    acknowledge_stress_func = FlowsFunctionSchema(
        name="acknowledge_stress",
        handler=acknowledge_stress,
        description=(
            "Use this after you have acknowledged the user's stress or bad day and "
            "offered one small, realistic step they can take."
        ),
        properties={},
        required=[],
    )

    return NodeConfig(
        name="stress_support",
        task_messages=[
            {
                "role": "system",
                "content": (
                    "The user sounds stressed, tired, or frustrated about money or work.\n\n"
                    "Your priorities:\n"
                    "1. Acknowledge how they feel.\n"
                    "2. Normalise it (others feel this too).\n"
                    "3. Offer ONE tiny realistic step (for today or this week).\n\n"
                    "Do not lecture. Keep it short and kind.\n"
                    "When you have done this, call acknowledge_stress so we can return to open conversation."
                ),
            }
        ],
        functions=[acknowledge_stress_func],
    )


def create_goal_node() -> NodeConfig:
    """Node for capturing and tracking user financial goals."""

    async def store_goal(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[GoalResult, NodeConfig]:
        goal = args["goal"]
        target_amount = args.get("target_amount")

        goals = flow_manager.state.setdefault("goals", [])
        goals.append(
            {
                "goal": goal,
                "target_amount": target_amount,
                "created_at": datetime.utcnow().isoformat(),
            }
        )

        result = GoalResult(goal=goal, target_amount=target_amount)

        # After setting a goal, we go back to entry so they can talk or plan further
        return result, create_entry_node()

    store_goal_func = FlowsFunctionSchema(
        name="store_goal",
        handler=store_goal,
        description=(
            "Use this when the user has described a financial goal like buying a bike, "
            "paying off a loan, or saving for a child. Optionally include a target amount."
        ),
        properties={
            "goal": {
                "type": "string",
                "description": "Short description of the user's goal.",
            },
            "target_amount": {
                "type": "number",
                "description": "Optional target amount in the user's local currency.",
            },
        },
        required=["goal"],
    )

    return NodeConfig(
        name="goal_setting",
        task_messages=[
            {
                "role": "system",
                "content": (
                    "Help the user turn their idea into a clear goal. Ask very simple questions, "
                    "like what they want and roughly how much it might cost. Keep it light.\n\n"
                    "Then call store_goal with the goal and, if they give it, a target amount. "
                    "We will go back to entry and keep chatting from there."
                ),
            }
        ],
        functions=[store_goal_func],
    )


def create_end_node() -> NodeConfig:
    """End node if you ever want to explicitly close the conversation."""
    return NodeConfig(
        name="end",
        task_messages=[
            {
                "role": "system",
                "content": (
                    "Thank the user for chatting with you. Tell them they can come back any day "
                    "to talk about money again. End the conversation politely and concisely."
                ),
            }
        ],
        post_actions=[{"type": "end_conversation"}],
    )


# --------------------------------------------------------------------
# Bot runtime
# --------------------------------------------------------------------


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    """Run the financial coach bot."""
    
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        live_options=LiveOptions(
            language="multi",  # ✅ enables automatic multilingual detection
            model="nova-3-general",  # ✅ default multilingual model
        ),
    )

    tts = SarvamTTSService(
        api_key=os.getenv("SARVAM_API_KEY"),
        model="bulbul:v2",
        voice_id="manisha",
    )

    # LLM service is created using the helper from the examples (utils.create_llm)
    llm = create_llm()

    context = LLMContext()
    context_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

    # Global functions available at every node
    async def record_earning(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[None, None]:
        amount = float(args["amount"])
        finance = flow_manager.state.setdefault("finance", {})
        earnings_log = finance.setdefault("earnings_log", [])
        earnings_log.append(
            {
                "amount": amount,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        return None, None

    async def record_expense(
        args: FlowArgs, flow_manager: FlowManager
    ) -> tuple[None, None]:
        amount = float(args["amount"])
        finance = flow_manager.state.setdefault("finance", {})
        expenses_log = finance.setdefault("expenses_log", [])
        expenses_log.append(
            {
                "amount": amount,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        return None, None

    record_earning_func = FlowsFunctionSchema(
        name="record_earning",
        handler=record_earning,
        description=(
            "Record an earning amount the user mentioned (for example, today's income or a big payment)."
        ),
        properties={
            "amount": {
                "type": "number",
                "description": "Amount earned.",
            }
        },
        required=["amount"],
    )

    record_expense_func = FlowsFunctionSchema(
        name="record_expense",
        handler=record_expense,
        description=(
            "Record an expense amount the user mentioned (for example, petrol, EMI, or other spends)."
        ),
        properties={
            "amount": {
                "type": "number",
                "description": "Amount spent.",
            }
        },
        required=["amount"],
    )

    # Initialize flow manager
    flow_manager = FlowManager(
        task=task,
        llm=llm,
        context_aggregator=context_aggregator,
        transport=transport,
        global_functions=[record_earning_func, record_expense_func],
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected to financial coach")
        await flow_manager.initialize(create_entry_node())

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected from financial coach")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)
    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point compatible with Pipecat Cloud."""
    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
