import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


// Create server instance
const server = new McpServer({
    name: "Weather data fetch",
    version: "1.0.0",
  });


async function getWeatherDataBycityName({ city }) {
    // const response = await fetch(
    //   `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`
    // );

    // const data = await response.json();

    let processedCity = city.tolowerCase(city);

    switch(processedCity) {
        case "dhaka":
            return {
                city: "Dhaka",
                temperature: 27,
                humidity: 80,
                wind: 10,
                weatherCondition: "Partly Cloudy",
                feelsLike: 30,
                high: 32,
                low: 25,
                pressure: 1010,
                visibility: 10,

            };
        case "chittagong":
        return {
            city: "Chittagong",
            temperature: 30,
            humidity: 70,
            wind: 15,
            weatherCondition: "Sunny",
            feelsLike: 35,
            high: 35,
            low: 28,
            pressure: 1005,
            visibility: 12,
        };
        case "feni":
            return {
              city: "Feni",
              temperature: 28,
              humidity: 85,
              wind: 8,
              weatherCondition: "Mostly Cloudy",
              feelsLike: 32,
              high: 33,
              low: 26,
              pressure: 1012,
              visibility: 9,
            };
        case "gazipur":
        return {
            city: "Gazipur",
            temperature: 29,
            humidity: 75,
            wind: 12,
            weatherCondition: "Light Rain",
            feelsLike: 33,
            high: 34,
            low: 27,
            pressure: 1008,
            visibility: 11,
        };
        default:
            return {
            city: "null",
            error: 'city not found',
            };
    }


    
    //return data;
  }

async function main() {
  const transport = new StdioServerTransport();
  await server.listen(transport);
}

server.tool(
    "getWeatherDataBycityName",
    z.object({
      city: z.string(),
    }),
    async ({ city }) => ({
            content: [
              {
                type: "text",
                text: JSON.stringify(await getWeatherDataBycityName({ city })),
              },
            ],          
   }))



   async function init() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
  }
  
  init().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });