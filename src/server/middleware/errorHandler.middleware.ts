type RequestLike = unknown;
type ResponseLike = { status: (code: number) => { json: (payload: unknown) => void } };
type NextLike = () => void;

const errorHandler = (err: unknown, _req: RequestLike, res: ResponseLike, _next: NextLike) => {
  console.error(err);
  res.status(500).json({
    status: "error",
    message: "An unexpected error occurred",
  });
};

export default errorHandler;