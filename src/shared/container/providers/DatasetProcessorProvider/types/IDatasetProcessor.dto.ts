export type ICreateProcessDTO = {
  user_id: string;
  dataset_id: string;
  processor_id: string;
};

export type IDispatchProcessDTO = {
  processing_id: string;
};
