"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ollama_1 = require("ollama");
// mcp sdk //
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("readline/promises"));
dotenv_1.default.config();
class MCPClient {
    mcp;
    // private llm: Anthropic;
    llm;
    // private llm2: Anthropic;
    transport = null;
    tools = [];
    messages = [
        {
            role: "system",
            content: `You are a helpful assistant tasked with performing mcp tools. 
      understand user asking about which city or country and then use provided tools. 
      to perform the user asked quetion use provided tools ,this are the provided tools name ${JSON.stringify(this.tools.map(({ name, description, input_schema }) => name).join(","))}
      now you will give answer by providing only a json schema like this json format precisely ${JSON.stringify({ "city": "Dhaka", "toolName": "getWeatherDataBycityName" })}
      if you do not get any exact information then only provide ${JSON.stringify({ "city": "null", "toolName": "null" })}`
        }
    ];
    ;
    constructor() {
        // this.llm2 = new Anthropic({
        //   apiKey: ANTHROPIC_API_KEY,
        // });
        this.llm = new ollama_1.Ollama();
        // this.llm = await ollama.chat({
        //   model: 'llama3.1',
        //   messages: [{ role: 'user', content: 'Why is the sky blue?' }],
        // })
        this.mcp = new index_js_1.Client({ name: "mcp-client-cli", version: "1.0.0" });
    }
    // Connect to the MCP
    async connectToServer(serverScriptPath) {
        const isJs = serverScriptPath.endsWith(".js");
        const isPy = serverScriptPath.endsWith(".py");
        if (!isJs && !isPy) {
            throw new Error("Server script must be a .js or .py file");
        }
        // const command = isPy
        //   ? process.platform === "win32"
        //     ? "python"
        //     : "python3"
        //   : process.execPath;
        const command = "node";
        this.transport = new stdio_js_1.StdioClientTransport({
            command, // python /path/to/server.py
            args: [serverScriptPath],
        });
        await this.mcp.connect(this.transport);
        // Register tools
        const toolsResult = await this.mcp.listTools();
        this.tools = toolsResult.tools.map((tool) => {
            return {
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
            };
        });
        console.log("Connected to server with tools:", 
        // this.tools.map(({ name }) => name).join(",")
        this.tools.map(({ name, description, input_schema }) => name).join(","));
    }
    isJsonString(str) {
        try {
            JSON.parse(str);
        }
        catch (e) {
            return false;
        }
        return true;
    }
    // Process query
    async processQuery(query) {
        const messages = [
            {
                role: "system",
                content: `You are a helpful assistant tasked with performing mcp tools. 
        understand user asking about which city or country and then use provided tools. 
        to perform the user asked quetion use provided tools ,this are the provided tools name ${JSON.stringify(this.tools.map(({ name, description, input_schema }) => name).join(","))}
        now you will give answer by providing only a json schema like this json format precisely ${JSON.stringify({ "city": "Dhaka", "toolName": "getWeatherDataBycityName" })}
        if you do not get any exact information then only provide ${JSON.stringify({ "city": "null", "toolName": "null" })}`
            },
            {
                role: "user",
                content: query,
            },
        ];
        let response;
        if (this.llm instanceof ollama_1.Ollama) {
            response = await this.llm.chat({
                model: "llama3.2",
                stream: true,
                messages: messages,
                //tools: this.tools,
            });
            // check the response
            let finalText = [];
            const toolResults = [];
            // if text -> return response
            for await (const part of response) {
                finalText.push(part.message.content);
            }
            let llmOutpout = finalText.join("");
            finalText = [];
            // console.log('yessssssssssss',llmOutpout, JSON.parse(llmOutpout), this.isJsonString(llmOutpout));
            if (this.isJsonString(llmOutpout)) {
                let mcpInpout = JSON.parse(llmOutpout);
                const city = mcpInpout.city;
                const toolName = mcpInpout.toolName;
                if (city && toolName) {
                    console.log(`[Calling tool ${toolName} with args ${JSON.stringify({ city })}]`);
                    const result = await this.mcp.callTool({
                        name: toolName,
                        arguments: { city },
                    });
                    // console.log('resultss of mcp', result)
                    toolResults.push(result !== null ? `[Calling tool ${toolName} with args ${JSON.stringify({ city })}]` : `tool call was unknown`);
                    messages.push({
                        role: "system",
                        content: `you can now use your own intelligence and provide answer by reading next messages contnets text section inforamtion, 
               use your own intelligence and provide answer as you want, and always give a readeble answer by boolet point 
               don't just give a json answer, give a human readable answer
               `,
                    });
                    messages.push({
                        role: "system",
                        content: `remeber our special user Mr. Masud Osman will be asking u quetions, first greet him and then response to his question,`,
                    });
                    let contentExtract = null;
                    if (result.content &&
                        Array.isArray(result.content) &&
                        result.content.length > 0 &&
                        result.content[0].type === "text") {
                        result.content[0].type === "text" ? contentExtract = result.content[0].text : "";
                    }
                    messages.push({
                        role: "user",
                        content: `now give me an explanation about city : ${city} from this ${contentExtract} information`,
                    });
                    // console.log({messages})
                    let response2 = await this.llm.chat({
                        model: "llama3.2",
                        stream: true,
                        messages: messages,
                        //tools: this.tools,
                    });
                    for await (const part of response2) {
                        //console.log("parttttt", part)
                        finalText.push(part.message.content);
                    }
                }
            }
            return finalText.join("");
        }
        return 'llm was not found';
    }
    async chatLoop() {
        const rl = promises_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        try {
            console.log("\nMCP Client Started!");
            console.log("Type your queries or 'quit' to exit.");
            while (true) {
                const message = await rl.question("\nQuery: ");
                if (message.toLowerCase() === "quit") {
                    break;
                }
                const response = await this.processQuery(message);
                // console.log('actual answer 1')
                console.log("\n" + response);
                // console.log('actual answer 2')
            }
        }
        finally {
            rl.close();
        }
    }
    async cleanup() {
        await this.mcp.close();
    }
}
async function main() {
    if (process.argv.length < 3) {
        console.log("Usage: node index.ts <path_to_server_script>");
        return;
    }
    const mcpClient = new MCPClient();
    try {
        await mcpClient.connectToServer(process.argv[2]);
        await mcpClient.chatLoop();
    }
    catch (e) {
        console.log(e);
    }
    finally {
        await mcpClient.cleanup();
        process.exit(0);
    }
}
main();
