// One cart line per dish AND chosen options: a customized dish carries a composite id
// ("<dishId>-<size>-<toppings>"), a plain dish uses its own id. _id alone would merge different choices.
export const cartLineKey = (food) => food.id || food._id
