export enum Kind {
  SEQ = 1,
  REPEAT,
  EXPR,
  OR,
}

export type Parser<In = any, Out = any> = (input: In) => Out;

type NodeBase = {
  reshape: Parser;
  key: string | void;
};

export type Node = Seq | Expr | Or | Repeat;

export type Seq = NodeBase & {
  kind: Kind.SEQ;
  children: Node[];
};

export type Repeat = NodeBase & {
  kind: Kind.REPEAT;
  pattern: Node;
};

export type Or = NodeBase & {
  kind: Kind.OR;
  patterns: Array<Seq | Expr>;
};

export type Expr = NodeBase & {
  kind: Kind.EXPR;
  expr: string;
};
