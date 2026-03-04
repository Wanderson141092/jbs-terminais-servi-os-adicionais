type RequestLike = { headers?: Record<string, string | undefined>; user?: unknown };
type ResponseLike = { status: (code: number) => { json: (payload: unknown) => void } };
type NextLike = () => void;

export const authMiddleware = (_req: RequestLike, _res: ResponseLike, next: NextLike) => {
  // Middleware placeholder para ambiente frontend-only.
  next();
};