// Constant import
import { MCP_TAKE_DEFAULT } from "@modules/mcp/constants/mcp.constant";

const MCP_USER_SELECTION = "id name email is_admin language";

const MCP_DATASET_SELECTION =
  "id description tags visibility created_at user_id";

const MCP_FILE_DOWNLOAD_SELECTION =
  "id filename mime_type size public_url public_url_expires_at";

const MCP_FILE_UPLOAD_SELECTION =
  "id filename mime_type size provider_status upload_url upload_url_expires_at";

const PROCESSOR_PARAMETER_SELECTION =
  "sequence name description type is_required default_value";

const MCP_PROCESSOR_SELECTION = `id name version visibility configuration { parameters { ${PROCESSOR_PARAMETER_SELECTION} } }`;

const MCP_ADMIN_PROCESSOR_SELECTION = `id name version image_tag description tags allowed_mime_types visibility configuration { command dataset_input_argument dataset_input_value dataset_output_argument dataset_output_value output_metrics_file_glob_patterns output_result_file_glob_patterns parameters { ${PROCESSOR_PARAMETER_SELECTION} } }`;

const MCP_PROCESSING_SELECTION =
  "id status visibility keep_until created_at started_at finished_at user_id";

const MCP_PROCESSING_DETAIL_SELECTION = `${MCP_PROCESSING_SELECTION} dataset { id description } processor { id name } result_file { ${MCP_FILE_DOWNLOAD_SELECTION} } metrics_file { ${MCP_FILE_DOWNLOAD_SELECTION} }`;

const MCP_PROCESSING_TIME_ESTIMATION_SELECTION =
  "dataset_id processor_id estimated_waiting_time estimated_execution_time estimated_total_time";

const MCP_PROCESSING_FINISH_ESTIMATION_SELECTION =
  "processing_id dataset_id processor_id estimated_start_time estimated_finish_time";

const MCP_WORKER_SELECTION =
  "id name version description tags last_seen_at archived_at created_at user_id";

const MCP_REGISTRATION_TOKEN_SELECTION =
  "id is_unlimited_usage expires_at created_at";

const MCP_AUTHORIZATION_GRANT_SELECTION =
  "id client_id client_name client_verified_host scopes created_at last_used_at expires_at";

const mcpConnectionSelection = (nodeSelection: string) =>
  `edges { node { ${nodeSelection} } } pageInfo { hasNextPage } totalCount`;

const MCP_PAGE_VARIABLES = `$take: Int = ${MCP_TAKE_DEFAULT}, $skip: Int = 0, $sorting: [SortingFieldSchema!]`;
const MCP_PAGE_ARGUMENTS = "take: $take, skip: $skip, sorting: $sorting";

export {
  MCP_ADMIN_PROCESSOR_SELECTION,
  MCP_AUTHORIZATION_GRANT_SELECTION,
  MCP_DATASET_SELECTION,
  MCP_FILE_DOWNLOAD_SELECTION,
  MCP_FILE_UPLOAD_SELECTION,
  MCP_PAGE_ARGUMENTS,
  MCP_PAGE_VARIABLES,
  MCP_PROCESSING_DETAIL_SELECTION,
  MCP_PROCESSING_FINISH_ESTIMATION_SELECTION,
  MCP_PROCESSING_SELECTION,
  MCP_PROCESSING_TIME_ESTIMATION_SELECTION,
  MCP_PROCESSOR_SELECTION,
  MCP_REGISTRATION_TOKEN_SELECTION,
  MCP_USER_SELECTION,
  MCP_WORKER_SELECTION,
  mcpConnectionSelection,
};
