// Util import
import type { IMcpToolWorld } from "./mcpToolWorld.util";

interface IMcpToolScenario {
  tool: string;
  caller: "owner" | "admin";
  input: (world: IMcpToolWorld) => Record<string, unknown>;
  volatile?: string[];
  refusal?: string;
}

const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

const PROCESSOR_DEFINITION = {
  name: "Created processor",
  version: "2.0.0",
  image_tag: "registry.example.test/created:2.0.0",
  description: null,
  tags: null,
  allowed_mime_types: "text/csv",
  visibility: "PUBLIC",
  configuration: {
    command: "python created.py",
    dataset_input_argument: "--in",
    dataset_input_value: "/in.csv",
    dataset_output_argument: "--out",
    dataset_output_value: "/out",
    output_metrics_file_glob_patterns: ["metrics*.csv"],
    output_result_file_glob_patterns: ["result*.zip"],
    parameters: [
      {
        sequence: 1,
        name: "epochs",
        description: "How many epochs",
        type: "INTEGER",
        is_required: true,
        default_value: "5",
      },
      {
        sequence: 2,
        name: "verbose",
        description: "Whether to log",
        type: "BOOLEAN",
        is_required: false,
        default_value: null,
      },
    ],
  },
};

const MCP_TOOL_SCENARIOS: IMcpToolScenario[] = [
  { tool: "autodroid_whoami", caller: "owner", input: () => ({}) },
  { tool: "autodroid_show_session", caller: "owner", input: () => ({}) },
  { tool: "autodroid_close_sessions", caller: "owner", input: () => ({}) },
  {
    tool: "autodroid_update_profile",
    caller: "owner",
    input: () => ({
      data: {
        name: "Renamed Person",
        phone_number: "+55 53 99999 9999",
        language: "pt-BR",
        notifications_enabled: false,
      },
    }),
  },
  {
    tool: "autodroid_update_profile_learning_data",
    caller: "owner",
    input: () => ({
      data: { lessonProgress: { intro: 1 }, nested: { camelCase: ["a", "b"] } },
    }),
  },
  {
    tool: "autodroid_list_mcp_connections",
    caller: "owner",
    input: () => ({}),
  },
  {
    tool: "autodroid_revoke_mcp_connection",
    caller: "owner",
    input: world => ({ mcp_authorization_grant_id: world.grant.id }),
  },
  { tool: "autodroid_list_datasets", caller: "owner", input: () => ({}) },
  {
    tool: "autodroid_list_datasets",
    caller: "owner",
    input: () => ({
      take: 1,
      skip: 1,
      sorting: [{ field: "created_at", order: "ASC" }],
    }),
  },
  {
    tool: "autodroid_show_dataset",
    caller: "owner",
    input: world => ({ dataset_id: world.ownDataset.id }),
  },
  {
    tool: "autodroid_show_dataset",
    caller: "owner",
    input: world => ({ dataset_id: world.publicDataset.id }),
  },
  {
    tool: "autodroid_create_dataset",
    caller: "owner",
    input: () => ({
      data: {
        filename: "created.csv",
        mime_type: "CSV",
        size: 1024,
        md5_hash: "d41d8cd98f00b204e9800998ecf8427e",
        description: "Created through MCP",
        tags: "mcp",
      },
    }),
    volatile: ["id", "created_at"],
  },
  {
    tool: "autodroid_update_dataset",
    caller: "owner",
    input: world => ({
      dataset_id: world.ownDataset.id,
      data: { description: "Updated through MCP", tags: "mcp,updated" },
    }),
  },
  {
    tool: "autodroid_update_dataset",
    caller: "owner",
    input: world => ({ dataset_id: world.ownDataset.id, data: { tags: null } }),
  },
  {
    tool: "autodroid_delete_dataset",
    caller: "owner",
    input: world => ({ dataset_id: world.ownDataset.id }),
  },
  {
    tool: "autodroid_publish_dataset",
    caller: "owner",
    input: world => ({ dataset_id: world.ownDataset.id }),
  },
  { tool: "autodroid_list_processors", caller: "owner", input: () => ({}) },
  {
    tool: "autodroid_show_processor",
    caller: "owner",
    input: world => ({ processor_id: world.processor.id }),
  },
  { tool: "autodroid_list_processing", caller: "owner", input: () => ({}) },
  {
    tool: "autodroid_list_processing",
    caller: "owner",
    input: world => ({
      dataset_id: world.ownDataset.id,
      status: "SUCCEEDED",
      visibility: "PRIVATE",
      started: true,
      finished: true,
    }),
  },
  {
    tool: "autodroid_show_processing",
    caller: "owner",
    input: world => ({ processing_id: world.finishedProcessing.id }),
  },
  {
    tool: "autodroid_run_processing",
    caller: "owner",
    input: world => ({
      data: {
        dataset_id: world.ownDataset.id,
        processor_id: world.processor.id,
        parameters: [{ name: "epochs", value: "3" }],
      },
    }),
    volatile: ["id", "created_at", "keep_until"],
  },
  {
    tool: "autodroid_delete_processing",
    caller: "owner",
    input: world => ({ processing_id: world.pendingProcessing.id }),
  },
  {
    tool: "autodroid_extend_processing",
    caller: "owner",
    input: world => ({
      processing_id: world.finishedProcessing.id,
      keep_until: inDays(7),
    }),
    volatile: ["keep_until"],
  },
  {
    tool: "autodroid_set_processing_visibility",
    caller: "owner",
    input: world => ({
      processing_id: world.finishedProcessing.id,
      visibility: "PUBLIC",
    }),
  },
  {
    tool: "autodroid_estimate_processing_time",
    caller: "owner",
    input: world => ({
      dataset_id: world.ownDataset.id,
      processor_id: world.processor.id,
    }),
  },
  {
    tool: "autodroid_estimate_processing_finish",
    caller: "owner",
    input: world => ({ processing_id: world.pendingProcessing.id }),
    volatile: ["estimated_start_time", "estimated_finish_time"],
  },
  {
    tool: "autodroid_health_check",
    caller: "owner",
    input: () => ({}),
    volatile: ["checked_at"],
  },
  {
    tool: "autodroid_health_liveness",
    caller: "owner",
    input: () => ({}),
    volatile: ["checked_at"],
  },
  {
    tool: "autodroid_health_readiness",
    caller: "owner",
    input: () => ({}),
    volatile: ["checked_at"],
  },
  { tool: "autodroid_admin_list_datasets", caller: "admin", input: () => ({}) },
  {
    tool: "autodroid_admin_list_datasets",
    caller: "admin",
    input: world => ({
      user_id: world.otherUser.id,
      visibility: "PUBLIC",
      sorting: [{ field: "created_at", order: "DESC" }],
    }),
  },
  {
    tool: "autodroid_admin_show_dataset",
    caller: "admin",
    input: world => ({ dataset_id: world.otherPrivateDataset.id }),
  },
  {
    tool: "autodroid_admin_update_dataset",
    caller: "admin",
    input: world => ({
      dataset_id: world.otherPrivateDataset.id,
      data: { description: "Admin edited", tags: "admin" },
    }),
  },
  {
    tool: "autodroid_admin_set_dataset_visibility",
    caller: "admin",
    input: world => ({
      dataset_id: world.otherPrivateDataset.id,
      data: { visibility: "PUBLIC" },
    }),
  },
  {
    tool: "autodroid_admin_delete_dataset",
    caller: "admin",
    input: world => ({ dataset_id: world.otherPrivateDataset.id }),
  },
  {
    tool: "autodroid_admin_list_processors",
    caller: "admin",
    input: () => ({}),
  },
  {
    tool: "autodroid_admin_show_processor",
    caller: "admin",
    input: world => ({ processor_id: world.processor.id }),
  },
  {
    tool: "autodroid_admin_show_processor",
    caller: "admin",
    input: world => ({ processor_id: world.hiddenProcessor.id }),
  },
  {
    tool: "autodroid_admin_create_processor",
    caller: "admin",
    input: () => ({ data: PROCESSOR_DEFINITION }),
    volatile: ["id"],
  },
  {
    tool: "autodroid_admin_update_processor",
    caller: "admin",
    input: world => ({
      processor_id: world.hiddenProcessor.id,
      data: { ...PROCESSOR_DEFINITION, description: "Replaced" },
    }),
  },
  {
    tool: "autodroid_admin_delete_processor",
    caller: "admin",
    input: world => ({ processor_id: world.hiddenProcessor.id }),
  },
  {
    tool: "autodroid_admin_list_processing",
    caller: "admin",
    input: () => ({}),
  },
  {
    tool: "autodroid_admin_list_processing",
    caller: "admin",
    input: world => ({
      user_id: world.ownerUser.id,
      status: "SUCCEEDED",
      created_at_start_date: "2026-01-01T00:00:00Z",
      created_at_end_date: "2027-01-01T00:00:00Z",
      keep_until_start_date: "2029-01-01T00:00:00Z",
      include_archived: true,
    }),
  },
  {
    tool: "autodroid_admin_show_processing",
    caller: "admin",
    input: world => ({ processing_id: world.finishedProcessing.id }),
  },
  {
    tool: "autodroid_admin_update_processing",
    caller: "admin",
    input: world => ({
      processing_id: world.finishedProcessing.id,
      data: { keep_until: inDays(14), visibility: "PUBLIC" },
    }),
    volatile: ["keep_until"],
  },
  {
    tool: "autodroid_admin_delete_processing",
    caller: "admin",
    input: world => ({ processing_id: world.finishedProcessing.id }),
  },
  {
    tool: "autodroid_admin_clean_expired_processing",
    caller: "admin",
    input: () => ({}),
  },
  {
    tool: "autodroid_admin_estimate_processing_time",
    caller: "admin",
    input: () => ({}),
  },
  {
    tool: "autodroid_admin_estimate_processing_time",
    caller: "admin",
    input: world => ({ processor_id: world.processor.id }),
  },
  {
    tool: "autodroid_admin_fail_dangling_processing",
    caller: "admin",
    input: () => ({
      created_at_end_date: "2026-06-01T00:00:00Z",
      status: "PENDING",
    }),
  },
  {
    tool: "autodroid_admin_list_workers",
    caller: "admin",
    input: world => ({ user_id: world.adminUser.id }),
  },
  {
    tool: "autodroid_admin_show_worker",
    caller: "admin",
    input: world => ({ worker_id: world.worker.id }),
  },
  {
    tool: "autodroid_admin_update_worker",
    caller: "admin",
    input: world => ({
      worker_id: world.worker.id,
      data: { description: "Admin described", tags: null },
    }),
  },
  {
    tool: "autodroid_admin_delete_worker",
    caller: "admin",
    input: world => ({ worker_id: world.worker.id }),
    volatile: ["archived_at"],
  },
  {
    tool: "autodroid_admin_clean_missing_workers",
    caller: "admin",
    input: () => ({}),
  },
  {
    tool: "autodroid_admin_list_worker_registration_tokens",
    caller: "admin",
    input: world => ({ user_id: world.adminUser.id }),
  },
  {
    tool: "autodroid_admin_show_worker_registration_token",
    caller: "admin",
    input: world => ({
      worker_registration_token_id: world.freeRegistrationToken.id,
    }),
  },
  {
    tool: "autodroid_admin_create_worker_registration_token",
    caller: "admin",
    input: () => ({
      data: { is_unlimited_usage: true, expires_at: "2031-06-01T00:00:00Z" },
    }),
    volatile: ["id", "token", "created_at"],
  },
  {
    tool: "autodroid_admin_delete_worker_registration_token",
    caller: "admin",
    input: world => ({
      worker_registration_token_id: world.freeRegistrationToken.id,
    }),
  },
  {
    tool: "autodroid_admin_remove_dangling_files",
    caller: "admin",
    input: () => ({}),
  },
];

const MISSING_ID = "00000000-0000-4000-8000-000000000000";

const MCP_TOOL_REFUSALS: IMcpToolScenario[] = [
  {
    tool: "autodroid_show_dataset",
    caller: "owner",
    input: () => ({ dataset_id: MISSING_ID }),
    refusal: "Dataset not found.",
  },
  {
    tool: "autodroid_show_dataset",
    caller: "owner",
    input: world => ({ dataset_id: world.otherPrivateDataset.id }),
    refusal: "Dataset not public.",
  },
  {
    tool: "autodroid_show_dataset",
    caller: "owner",
    input: () => ({ dataset_id: "not-a-uuid" }),
    refusal: "Dataset not found.",
  },
  {
    tool: "autodroid_delete_dataset",
    caller: "owner",
    input: world => ({ dataset_id: world.publicDataset.id }),
    refusal: "Dataset not editable.",
  },
  {
    tool: "autodroid_show_processing",
    caller: "owner",
    input: () => ({ processing_id: "not-a-uuid" }),
    refusal: "processing_id is not a valid CUID",
  },
  {
    tool: "autodroid_show_processing",
    caller: "owner",
    input: () => ({ processing_id: MISSING_ID }),
    refusal: "Processing not found.",
  },
  {
    tool: "autodroid_create_dataset",
    caller: "owner",
    input: () => ({
      data: {
        filename: "created.csv",
        mime_type: "CSV",
        size: 1024,
        md5_hash: "not-an-md5",
      },
    }),
    refusal: "md5_hash must be a hash of type md5",
  },
  {
    tool: "autodroid_update_profile",
    caller: "owner",
    input: () => ({
      data: { name: "Renamed Person", phone_number: "not a phone" },
    }),
    refusal: "phone_number must be a valid phone number",
  },
  {
    tool: "autodroid_update_profile",
    caller: "owner",
    input: () => ({
      data: { name: "Renamed Person", language: "xx-invalid" },
    }),
    refusal: "Invalid language.",
  },
  {
    tool: "autodroid_run_processing",
    caller: "owner",
    input: world => ({
      data: {
        dataset_id: world.ownDataset.id,
        processor_id: world.hiddenProcessor.id,
        parameters: [],
      },
    }),
    refusal: "Processor not public.",
  },
  {
    tool: "autodroid_revoke_mcp_connection",
    caller: "owner",
    input: () => ({ mcp_authorization_grant_id: "unknown-grant" }),
    refusal: "Connection not found.",
  },
  {
    tool: "autodroid_extend_processing",
    caller: "owner",
    input: world => ({
      processing_id: world.finishedProcessing.id,
      keep_until: "2031-01-01T00:00:00Z",
    }),
    refusal: "The date must be less than or equal to 30 days from now",
  },
  {
    tool: "autodroid_admin_show_dataset",
    caller: "admin",
    input: () => ({ dataset_id: MISSING_ID }),
    refusal: "Dataset not found.",
  },
  {
    tool: "autodroid_admin_update_worker",
    caller: "admin",
    input: () => ({ worker_id: MISSING_ID, data: { tags: "x" } }),
    refusal: "Worker not found.",
  },
];

export { MCP_TOOL_REFUSALS, MCP_TOOL_SCENARIOS };
