var express = require("express");
var router  = express.Router();
var Blog = require("../models/blog");
var Comment = require("../models/comment");
var middleware = require("../middleware");
var geocoder = require('geocoder');
var { isLoggedIn, checkUserBlog, checkUserComment, isAdmin, isSafe } = middleware; // destructuring assignment

// Define escapeRegex function for search feature
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

//INDEX - show all Blogs
router.get("/", function(req, res){
  if(req.query.search && req.xhr) {
      const regex = new RegExp(escapeRegex(req.query.search), 'gi');
      // Get all Blogs from DB
      Blog.find({name: regex}, function(err, allBlogs){
         if(err){
            console.log(err);
         } else {
            res.status(200).json(allBlogs);
         }
      });
  } else {
      // Get all Blogs from DB
      Blog.find({}, function(err, allBlogs){
         if(err){
             console.log(err);
         } else {
            if(req.xhr) {
              res.json(allBlogs);
            } else {
              res.render("blogs/index",{blogs: allBlogs, page: 'blogs'});
            }
         }
      });
  }
});

//CREATE - add new blog to DB
router.post("/", isLoggedIn, isSafe, function(req, res){
  // get data from form and add to blogs array
  var name = req.body.name;
  var image = req.body.image;
  var desc = req.body.description;
  var author = {
      id: req.user._id,
      username: req.user.username
  }
  var cost = req.body.cost;
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || data.status === 'ZERO_RESULTS') {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    var lat = data.results[0].geometry.location.lat;
    var lng = data.results[0].geometry.location.lng;
    var location = data.results[0].formatted_address;
    var newBlog = {name: name, image: image, description: desc, cost: cost, author:author, location: location, lat: lat, lng: lng};
    // Create a new Blog and save to DB
    Blog.create(newBlog, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to Blogs page
            console.log(newlyCreated);
            res.redirect("/blogs");
        }
    });
  });
});

//NEW - show form to create new blog
router.get("/new", isLoggedIn, function(req, res){
   res.render("blogs/new");
});

// SHOW - shows more info about one blog
router.get("/:id", function(req, res){
    //find the blog with provided ID
    Blog.findById(req.params.id).populate("comments").exec(function(err, foundBlog){
        if(err || !foundBlog){
            console.log(err);
            req.flash('error', 'Sorry, that blog does not exist!');
            return res.redirect('/blogs');
        }
        console.log(foundBlog)
        //render show template with that Blog
        res.render("blogs/show", {blog: foundBlog});
    });
});

// EDIT - shows edit form for a Blog
router.get("/:id/edit", isLoggedIn, checkUserBlog, function(req, res){
  //render edit template with that Blog
  res.render("blogs/edit", {blog: req.blog});
});

// PUT - updates blog in the database
router.put("/:id", isSafe, function(req, res){
  geocoder.geocode(req.body.location, function (err, data) {
    var lat = data.results[0].geometry.location.lat;
    var lng = data.results[0].geometry.location.lng;
    var location = data.results[0].formatted_address;
    var newData = {name: req.body.name, image: req.body.image, description: req.body.description, cost: req.body.cost, location: location, lat: lat, lng: lng};
    Blog.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, blog){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/blogs/" + blog._id);
        }
    });
  });
});

// DELETE - removes blog and its comments from the database
router.delete("/:id", isLoggedIn, checkUserBlog, function(req, res) {
    Comment.remove({
      _id: {
        $in: req.blog.comments
      }
    }, function(err) {
      if(err) {
          req.flash('error', err.message);
          res.redirect('/');
      } else {
          req.blog.remove(function(err) {
            if(err) {
                req.flash('error', err.message);
                return res.redirect('/');
            }
            req.flash('error', 'Blog deleted!');
            res.redirect('/blogs');
          });
      }
    })
});

module.exports = router;
