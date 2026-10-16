import { ClassType, Field, Int, ObjectType } from "type-graphql";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { makeCursorObjFromEntity } from "../utils/makeCursorObjFromEntity";
import { makePaginationObj } from "../utils/makePaginationObj";

// Type import
import {
  IConnection,
  IMakePaginationConnection,
  INodeEntity,
} from "../types/IPagination.type";

// Entity import
import { PageInfo } from "./pageInfo.entity";
import { PaginationEdge } from "./paginationEdge.entity";

// Scalar import
import { serializeCursor } from "../types/paginationConnectionCursor.scalar";

export function PaginationConnection<IEntity extends INodeEntity>(
  EntityClass: ClassType<IEntity>,
) {
  const EntityEdge = PaginationEdge(EntityClass);
  type IEntityEdge = InstanceType<typeof EntityEdge>;

  @ObjectType(
    `${EntityClass.name || (EntityClass as unknown as symbol).description}PaginationConnection`,
  )
  class PaginationConnectionFactory implements IConnection<IEntity> {
    @Field(() => [EntityEdge])
    edges: IEntityEdge[];

    @Field(() => PageInfo)
    pageInfo: PageInfo;

    @Field(() => Int)
    totalCount: number;

    static make({
      items,
      totalCount,
      paginationRequest,

      hasIncludedBoundaries = true,
    }: IMakePaginationConnection<IEntity>) {
      const connection = new PaginationConnectionFactory();

      const pagination = makePaginationObj(paginationRequest);

      connection.totalCount = totalCount;

      const { cursor, skip, take } = pagination;

      // Cursor pagination
      if (cursor) {
        const cursorTake = take as number;

        if (!items.length)
          throw new AppError({
            key: "@pagination/CURSOR_NOT_FOUND",
            message:
              "The cursor points to a row that no longer exists or is no longer listed.",
            statusCode: 400,
          });

        const isForward = cursorTake > 0;
        const pageSize = Math.abs(cursorTake) - 2;

        const cursorIndex = items.findIndex(item => item.id === cursor.id);
        const hasCursorRow = cursorIndex >= 0;

        const itemsWithoutCursor =
          hasIncludedBoundaries && hasCursorRow
            ? isForward
              ? items.slice(cursorIndex + 1)
              : items.slice(0, cursorIndex)
            : items;

        const hasMoreBeyondPage = itemsWithoutCursor.length > pageSize;

        const itemsWithoutExcess = hasMoreBeyondPage
          ? isForward
            ? itemsWithoutCursor.slice(0, pageSize)
            : itemsWithoutCursor.slice(-pageSize)
          : itemsWithoutCursor;

        connection.edges = itemsWithoutExcess.map(item => ({
          node: item,
          cursor: serializeCursor(makeCursorObjFromEntity(item)),
        }));

        connection.pageInfo = {
          startCursor: connection.edges[0]?.cursor || null,
          endCursor: connection.edges.slice(-1)[0]?.cursor || null,
          hasPreviousPage: isForward ? hasCursorRow : hasMoreBeyondPage,
          hasNextPage: isForward ? hasMoreBeyondPage : hasCursorRow,
        };
      }

      // Skip take pagination
      else {
        connection.edges = items.map(item => ({
          node: item,
          cursor: serializeCursor(makeCursorObjFromEntity(item)),
        }));

        connection.pageInfo = {
          startCursor: connection.edges[0]?.cursor || null,
          endCursor: connection.edges.slice(-1)[0]?.cursor || null,
          hasPreviousPage: skip > 0,
          hasNextPage: take !== undefined && skip + take < totalCount,
        };
      }

      return connection;
    }
  }

  return PaginationConnectionFactory;
}
