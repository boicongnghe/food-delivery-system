// Tells the hearing controller which kind of case the route is about: 'delivery_issue' | 'complaint'
export const forCase = (caseType) => (req, res, next) => {
  req.caseType = caseType;
  next();
};

export default forCase;
