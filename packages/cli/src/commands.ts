// Client import
import { executeGraphQL } from "./client/autodroidClient";

// Session import
import { signInWithPassword } from "./auth/firebaseSession";
import { clearSession, writeSession } from "./auth/sessionStore";

// Context import
import { getCliConfig, resolveIdToken } from "./context";

const USER_QUERY = `
  query User {
    user {
      id
      name
      email
      is_admin
      language
    }
  }
`;

const USER_DATASETS_QUERY = `
  query UserDatasets($skip: Int, $take: Int) {
    userDatasets(skip: $skip, take: $take) {
      edges {
        node {
          id
          description
          tags
          visibility
          created_at
        }
      }
    }
  }
`;

const USER_PROCESSORS_QUERY = `
  query UserProcessors($skip: Int, $take: Int) {
    userProcessors(skip: $skip, take: $take) {
      edges {
        node {
          id
          name
          version
          visibility
          configuration {
            parameters {
              sequence
              name
              description
              type
              is_required
              default_value
            }
          }
        }
      }
    }
  }
`;

const USER_PROCESSES_QUERY = `
  query UserProcesses($skip: Int, $take: Int) {
    userProcesses(skip: $skip, take: $take) {
      edges {
        node {
          id
          status
          created_at
          started_at
          finished_at
        }
      }
    }
  }
`;

const USER_PROCESSING_QUERY = `
  query UserProcessing($processing_id: String!) {
    userProcessing(processing_id: $processing_id) {
      id
      status
      created_at
      started_at
      finished_at
      dataset {
        id
        description
      }
      processor {
        id
        name
      }
    }
  }
`;

const USER_UPDATE_DATA_MUTATION = `
  mutation UserUpdateData($data: UserUpdateDataSchema!) {
    userUpdateData(data: $data) {
      id
      name
      email
      phone_number
      language
      notifications_enabled
    }
  }
`;

const USER_REQUEST_DATASET_PROCESSING_MUTATION = `
  mutation UserRequestDatasetProcessing($data: RequestDatasetProcessingSchema!) {
    userRequestDatasetProcessing(data: $data) {
      id
      status
      created_at
    }
  }
`;

const USER_PROCESSING_TIME_ESTIMATION_QUERY = `
  query UserProcessingTimeEstimation($dataset_id: String!, $processor_id: String!) {
    userProcessingTimeEstimation(dataset_id: $dataset_id, processor_id: $processor_id) {
      dataset_id
      processor_id
      estimated_execution_time
      estimated_total_time
      estimated_waiting_time
    }
  }
`;

const USER_PROCESSING_ESTIMATED_FINISH_QUERY = `
  query UserProcessingEstimatedFinish($processing_id: String!) {
    userProcessingEstimatedFinish(processing_id: $processing_id) {
      processing_id
      dataset_id
      processor_id
      estimated_start_time
      estimated_finish_time
    }
  }
`;

const runQuery = async <T>(query: string, variables?: Record<string, any>) => {
  const { endpoint } = getCliConfig();
  const idToken = await resolveIdToken();

  return executeGraphQL<T>({ endpoint, idToken, query, variables });
};

const login = async (params: { email: string; password: string }) => {
  const { apiKey } = getCliConfig();

  const session = await signInWithPassword({ ...params, apiKey });

  await writeSession(session);

  return { expiresAt: session.expiresAt };
};

const logout = async (): Promise<void> => {
  await clearSession();
};

const whoami = async () => {
  const data = await runQuery<{ user: Record<string, any> }>(USER_QUERY);
  return data.user;
};

const page = (first: number) => ({ skip: 0, take: first });

const listDatasets = async (params: { first: number }) => {
  const data = await runQuery<{
    userDatasets: { edges: { node: Record<string, any> }[] };
  }>(USER_DATASETS_QUERY, page(params.first));

  return data.userDatasets.edges.map(edge => edge.node);
};

const listProcessors = async (params: { first: number }) => {
  const data = await runQuery<{
    userProcessors: { edges: { node: Record<string, any> }[] };
  }>(USER_PROCESSORS_QUERY, page(params.first));

  return data.userProcessors.edges.map(edge => edge.node);
};

const listProcesses = async (params: { first: number }) => {
  const data = await runQuery<{
    userProcesses: { edges: { node: Record<string, any> }[] };
  }>(USER_PROCESSES_QUERY, page(params.first));

  return data.userProcesses.edges.map(edge => edge.node);
};

const showProcessing = async (params: { processingId: string }) => {
  const data = await runQuery<{ userProcessing: Record<string, any> }>(
    USER_PROCESSING_QUERY,
    { processing_id: params.processingId },
  );

  return data.userProcessing;
};

const updateProfile = async (params: {
  name: string;
  phoneNumber?: string;
  language?: string;
  notificationsEnabled?: boolean;
}) => {
  const data = await runQuery<{ userUpdateData: Record<string, any> }>(
    USER_UPDATE_DATA_MUTATION,
    {
      data: {
        name: params.name,
        phone_number: params.phoneNumber,
        language: params.language,
        notifications_enabled: params.notificationsEnabled,
      },
    },
  );

  return data.userUpdateData;
};

const runProcessing = async (params: {
  datasetId: string;
  processorId: string;
  parameters: { name: string; value: string }[];
}) => {
  const data = await runQuery<{
    userRequestDatasetProcessing: Record<string, any>;
  }>(USER_REQUEST_DATASET_PROCESSING_MUTATION, {
    data: {
      dataset_id: params.datasetId,
      processor_id: params.processorId,
      parameters: params.parameters,
    },
  });

  return data.userRequestDatasetProcessing;
};

const estimateProcessingTime = async (params: {
  datasetId: string;
  processorId: string;
}) => {
  const data = await runQuery<{
    userProcessingTimeEstimation: Record<string, any>;
  }>(USER_PROCESSING_TIME_ESTIMATION_QUERY, {
    dataset_id: params.datasetId,
    processor_id: params.processorId,
  });

  return data.userProcessingTimeEstimation;
};

const estimateProcessingFinish = async (params: { processingId: string }) => {
  const data = await runQuery<{
    userProcessingEstimatedFinish: Record<string, any>;
  }>(USER_PROCESSING_ESTIMATED_FINISH_QUERY, {
    processing_id: params.processingId,
  });

  return data.userProcessingEstimatedFinish;
};

export {
  estimateProcessingFinish,
  estimateProcessingTime,
  listDatasets,
  listProcesses,
  listProcessors,
  login,
  logout,
  runProcessing,
  showProcessing,
  updateProfile,
  whoami,
};
