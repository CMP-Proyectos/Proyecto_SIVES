import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

console.log("Hello from Functions!");


export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {


    const { name } = await req.json();

    return Response.json({
      message: `Hello ${name}!`,
    });
  }),
};
