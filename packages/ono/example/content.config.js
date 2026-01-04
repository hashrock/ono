export const collections = {
  blog: {
    schema: {
      title: { type: "string", required: true },
      date: { type: "date", required: true },
      author: { type: "string", required: true },
      tags: { type: "array", items: "string" },
      draft: { type: "boolean", default: false },
    },
  },
};
