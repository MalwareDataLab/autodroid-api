const executeGraphQL = async <T = Record<string, any>>(params: {
  endpoint: string;
  idToken?: string;
  query: string;
  variables?: Record<string, any>;
}): Promise<T> => {
  const { endpoint, idToken, query, variables } = params;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });

  if (!response.ok)
    throw new Error(
      `AutoDroid API request failed with status ${response.status}.`,
    );

  const payload = await response.json();

  if (payload.errors?.length) throw new Error(payload.errors[0].message);

  return payload.data;
};

export { executeGraphQL };
