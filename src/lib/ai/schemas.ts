import { z } from "zod";

// JSON-schema-ish zod definitions for AI tool calls. Phase G+ when we wire real Anthropic
// tool use, these become the parameter schemas. For Phase G mock streaming they're just exports.

export const searchOpportunitiesTool = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(25).default(10),
});

export const getOpportunityTool = z.object({
  id: z.string().min(1),
});

export const annotateOpportunityTool = z.object({
  id: z.string().min(1),
  body: z.string().min(1).max(1000),
});

export const shortlistOpportunityTool = z.object({
  id: z.string().min(1),
  status: z.enum(["shortlisted", "building", "abandoned"]),
});

export const ANTHROPIC_TOOLS = [
  {
    name: "search_opportunities",
    description: "Full-text search across the user's tracked opportunities.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 25 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_opportunity",
    description: "Fetch a single opportunity by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "annotate_opportunity",
    description: "Append an annotation to an opportunity on behalf of the user.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, body: { type: "string" } },
      required: ["id", "body"],
    },
  },
  {
    name: "shortlist_opportunity",
    description: "Update the status of an opportunity (shortlisted, building, abandoned).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["shortlisted", "building", "abandoned"] },
      },
      required: ["id", "status"],
    },
  },
] as const;
