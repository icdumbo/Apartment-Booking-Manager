// Retired staging entry point. Existing configurations cannot reactivate it.
export default {
 fetch(){return new Response(null,{status:410});},
 scheduled(){return {disabled:true};}
};
