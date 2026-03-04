type RequestLike = { user?: { role?: string } };
type ResponseLike = { status: (code: number) => { json: (payload: unknown) => void } };
type NextLike = () => void;

export const authorize = (roles: string[]) => {
  return (req: RequestLike, res: ResponseLike, next: NextLike) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied." });
    }

    next();
  };
};
