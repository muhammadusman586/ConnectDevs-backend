const userAuth=(req,res,next)=>{
    console.log("User is authenticated");
    next();
}

module.exports ={
    userAuth,
}