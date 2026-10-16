interface IConnection {
  edges: { node: unknown }[];
  totalCount: number;
  pageInfo: { hasNextPage: boolean };
}

const isConnection = (value: unknown): value is IConnection =>
  typeof value === "object" && value !== null && "edges" in value;

const toPage = (connection: IConnection) => ({
  items: connection.edges.map(edge => edge.node),
  total_count: connection.totalCount,
  has_next_page: connection.pageInfo.hasNextPage,
});

const wholeListToPage = (items: unknown[]) => ({
  items,
  total_count: items.length,
  has_next_page: false,
});

const rootFieldValue = (data: Record<string, any>) => Object.values(data)[0];

const defaultResult = (data: Record<string, any>) => {
  const value = rootFieldValue(data);
  return isConnection(value) ? toPage(value) : value;
};

const wholeListResult = (data: Record<string, any>) =>
  wholeListToPage(rootFieldValue(data));

const namedFieldResult = (name: string) => (data: Record<string, any>) => ({
  [name]: rootFieldValue(data),
});

const checkedAtResult = namedFieldResult("checked_at");

export { checkedAtResult, namedFieldResult, defaultResult, wholeListResult };
