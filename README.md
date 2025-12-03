# JSON-RPC Tool Service

This document provides instructions on how to interact with the JSON-RPC service, which allows you to call predefined tools.

## API Endpoint

All requests should be sent to the following URL:

```
https://starterstory-mcp.onrender.com/mcp
```

## How to Make a Request

To use the service, you need to send an HTTP `POST` request to the API endpoint. The request must follow the JSON-RPC 2.0 specification.

### Headers

Your request must include the following headers:

- `Content-Type: application/json`: Indicates that the request body is in JSON format.
- `Accept: application/json, text/event-stream`: Specifies that your client can handle either a standard JSON response or a stream of events.

### Request Body

The body of your `POST` request should be a JSON object with the following structure:

- `jsonrpc` (string): **Required.** Must be `"2.0"`.
- `id` (number|string): **Required.** A unique identifier for the request. The server will use this same ID in its response.
- `method` (string): **Required.** The method to be invoked. For calling tools, this should be `"tools/call"`.
- `params` (object): **Required.** An object containing the parameters for the method.
  - `name` (string): The name of the tool you want to call.
  - `arguments` (object): An object containing the arguments for the specified tool.

## Example Request

Here is an example of how to call the `search_transcripts` tool using `curl`. This tool searches for a given query within a set of transcripts.

```bash
curl -X POST https://starterstory-mcp.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_transcripts",
    "arguments": { "query": "best marketing channel" }
  }
}'
```

## Available Tools

Below is a list of known tools and their arguments.

### `search_transcripts`

Searches through transcripts based on a query.

- **Arguments**:
  - `query` (string): The text you want to search for.
