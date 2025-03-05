import { ObjectId } from "mongodb-rag-core/mongodb";

export interface GenerationNode<T> {
  _id: ObjectId;
  parent: GenerationNode<unknown> | null;
  children?: GenerationNode<unknown>[];
  data: T;
  updated: Date;
}

export type DbGenerationNode<T> = Omit<
  GenerationNode<T>,
  "parent" | "children"
> & {
  parent: ObjectId | null;
  children?: ObjectId[];
};

export type WithParentNode<
  Node extends GenerationNode<unknown>,
  ParentNode extends GenerationNode<unknown> | null
> = Node & {
  parent: ParentNode;
};

export function convertGenerationNodeToDbNode<T>(
  node: GenerationNode<T>
): DbGenerationNode<T> {
  const dbNode = {
    ...node,
    parent: node.parent?._id ?? null,
    children: node.children?.map((child) => child._id),
  };
  // Remove the children field if there are no children
  // So it's not populated in MongoDB as `children: null`
  if (dbNode.children?.length === 0 || !dbNode.children) {
    delete dbNode.children;
  }
  return dbNode;
}
