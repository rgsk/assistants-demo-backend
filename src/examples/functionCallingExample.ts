import environmentVars from "lib/environmentVars";
import OpenAI from "openai";
const client = new OpenAI({ apiKey: environmentVars.OPENAI_API_KEY });

const main = async () => {
  const assistant = await client.beta.assistants.create({
    model: "gpt-4o",
    instructions:
      "You are a weather bot. Use the provided functions to answer questions.",
    tools: [
      {
        type: "function",
        function: {
          name: "getCurrentTemperature",
          description: "Get the current temperature for a specific location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g., San Francisco, CA",
              },
              unit: {
                type: "string",
                enum: ["Celsius", "Fahrenheit"],
                description:
                  "The temperature unit to use. Infer this from the user's location.",
              },
            },
            required: ["location", "unit"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getRainProbability",
          description: "Get the probability of rain for a specific location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g., San Francisco, CA",
              },
            },
            required: ["location"],
          },
        },
      },
    ],
  });
  const thread = await client.beta.threads.create();
  const message = client.beta.threads.messages.create(thread.id, {
    role: "user",
    content:
      "What's the weather in San Francisco today and the likelihood it'll rain?",
  });
  // @ts-ignore
  const handleRequiresAction = async (run: OpenAI.Beta.Threads.Runs.Run) => {
    // Check if there are tools that require outputs
    if (
      run.required_action &&
      run.required_action.submit_tool_outputs &&
      run.required_action.submit_tool_outputs.tool_calls
    ) {
      // Loop through each tool in the required action section
      const toolOutputs =
        run.required_action.submit_tool_outputs.tool_calls.map((tool) => {
          if (tool.function.name === "getCurrentTemperature") {
            console.log(tool.function.name);
            console.log(tool.function.arguments);
            return {
              tool_call_id: tool.id,
              output: "57",
            };
          } else if (tool.function.name === "getRainProbability") {
            console.log(tool.function.name);
            console.log(tool.function.arguments);
            return {
              tool_call_id: tool.id,
              output: "0.06",
            };
          }
        });

      // Submit all tool outputs at once after collecting them in a list
      if (toolOutputs.length > 0) {
        run = await client.beta.threads.runs.submitToolOutputsAndPoll(
          thread.id,
          run.id,
          // @ts-ignore
          { tool_outputs: toolOutputs }
        );
        console.log("Tool outputs submitted successfully.");
      } else {
        console.log("No tool outputs to submit.");
      }

      // Check status after submitting tool outputs
      return handleRunStatus(run);
    }
  };
  // @ts-ignore
  const handleRunStatus = async (run: OpenAI.Beta.Threads.Runs.Run) => {
    // Check if the run is completed
    if (run.status === "completed") {
      let messages = await client.beta.threads.messages.list(thread.id);
      console.log((messages.data[0].content[0] as any).text.value);
      return messages.data;
    } else if (run.status === "requires_action") {
      console.log(run.status);
      return await handleRequiresAction(run);
    } else {
      console.error("Run did not complete:", run);
    }
  };

  // Create and poll run
  let run = await client.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  handleRunStatus(run);
};

main();
