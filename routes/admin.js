var express = require('express');
var router = express.Router();
var producthelpers = require('../helpers/producthelpers')
var adminhelpers = require('../helpers/adminhelpers')
// const multer = require('multer');
const userhelpers = require('../helpers/userhelpers');
const { Db } = require('mongodb');
const { response } = require('express');
const { route } = require('./users');
var Handlebars = require('handlebars');

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, '/admin/productimage')
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//   }
// })

// var upload = multer({ storage: storage })

const verifyAdmin=(req,res,next)=>{
  if(req.session.admin){
    next()
  }else{
    res.redirect('/admin/')
  }
}



const Dbemail = "admin01@gmail.com";
const Dbpassword = "12345";


// =============================Admin Home======================

/* GET users listing. */
router.get('/', async function (req, res, next) {
  try {
    if (req.session.loggedIn) {
      let totalSale = await adminhelpers.totalsale()
      let totalOrders = await adminhelpers.totalorders()
      let totalUsers = await adminhelpers.totalusers()
      let deliveredStatus = await adminhelpers.delStatus()
      // let monthlySale = await adminhelpers.monthlySale()
      let fetchMonths = await adminhelpers.fetchMonths()
      let dailySale = await adminhelpers.dailySale()
      let recentSale = await adminhelpers.recentSale()
      // console.log(recentSale, 'hey reverse');
      res.render('admin/dashboard', { admin: true, layout: "admin-layout", totalOrders, totalUsers, totalSale, deliveredStatus, fetchMonths, dailySale, recentSale });
    } else {
      res.render('admin/admin-login', { "AdminloginErr": req.session.logedErr })
      req.session.logedErr = false
    }
  } catch (err) {
    console.log('error in Login', err);
    res.redirect('/admin/404')
  }
});


router.post('/', (req, res) => {
  const admindata = { adminemail, adminpassword } = req.body
  try {
    if (adminemail === Dbemail && adminpassword === Dbpassword) {

      req.session.loggedIn = true
      req.session.admin = admindata
      res.redirect('/admin/')

    } else {
      req.session.logedErr = true
      res.redirect('/admin/')
    }
  } catch (err) {
    console.log('error in login', err);
    res.redirect('/admin/404')
  }
})

router.get('/adminlogout', (req, res) => {
  req.session.loggedIn = false;
  res.redirect('/admin')

});


// ============================= Error page  ====================== //

router.get('/404',(req,res)=>{
  res.render('admin/404',{ admin: true, layout: "admin-layout"})
})

// ============================= Product ====================== //

router.get('/addproduct',verifyAdmin, async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  res.render('admin/addproducts', { admin: true, layout: "admin-layout", category })
});


router.post('/addproduct',verifyAdmin, (req, res, next) => {
  try{
    let productData = {}
    productData.MRP = 0
    productData = req.body
    productData.price = parseInt(req.body.price)
    productData.stock = parseInt(req.body.stock)
    productData.MRP = parseInt(req.body.price)
  
    producthelpers.addProduct(productData).then(async (id) => {
  
      // let category = await producthelpers.GetallCategory(req.body)
      let image = req?.files?.image
      let image2 = req?.files?.image2
      let image3 = req?.files?.image3
      image.mv('./public/admin/productimage/' + id + '.jpg')
      image2.mv('./public/admin/productimage/' + id + '2.jpg')
      image3.mv('./public/admin/productimage/' + id + '3.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/addproduct')
        } else {
          console.log(err);
          console.log('kkkkk');
          res.redirect('/admin/404')
        }
      })
    }).catch((err)=>{
      console.log('error in add image',err);
      res.redirect('/admin/404')
    })
   } catch (err) {
    console.log('error in add image',err);
    res.redirect('/admin/404')
  }
});



router.get('/products', verifyAdmin, async (req, res) => {
  const perPage = 10;
  let pageNum;
  let skip;
  let productCount;
  let pages;
  pageNum = parseInt(req.query.page) >= 1 ? parseInt(req.query.page) : 1;
  skip = (pageNum - 1) * perPage
  await producthelpers.getProductCount().then((count) => {
    productCount = count;
  })
  pages = Math.ceil(productCount / perPage)

  Handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
  });
  Handlebars.registerHelper('for', function (from, to, incr, block) {
    var accum = '';
    for (var i = from; i <= to; i += incr)
      accum += block.fn(i);
    return accum;
  });
  let index = parseInt(skip) >= 1 ? skip + 1 : 1
  Handlebars.registerHelper("inc", function (value, options) {
    return parseInt(value) + index;
  });

  try {
    producthelpers.getPaginatedProducts(skip, perPage).then((products) => {
      res.render('admin/products', { admin: true, layout: "admin-layout", products, totalDoc: productCount, currentPage: pageNum, pages: pages })

    }).catch((err) => {
      console.log('error in viewproduct', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in view product', err);
    res.redirect('/admin/404')
  }
});


router.get('/delete-product/:id', verifyAdmin, (req, res) => {
  let proId = req.params.id
  try {
    producthelpers.deleteProducts(proId)
      .then((response) => {
        res.redirect('/admin/products')
      }).catch((err) => {
        console.log('error in delete product', err);
        res.redirect('/admin/404')
      })
  } catch {
    console.log('error in delete product', err);
    res.redirect('/admin/404')
  }
});

router.get('/edit-product/:id',verifyAdmin, async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  let product = await producthelpers.getAllproductdetails(req.params.id)
  console.log(product);
  res.render('admin/edit-products', { admin: true, layout: "admin-layout", product, category })
});


router.post('/edit-product/:id', verifyAdmin, (req, res) => {
  req.body.price = parseInt(req.body.price)
  req.body.stock = parseInt(req.body.stock)
  let id = req.params.id
  try {
    producthelpers.updateProducts(req.params.id, req.body).then(() => {
      let image = req.files?.image
      let image2 = req.files?.image2
      let image3 = req.files?.image3
      res.redirect('/admin/products')
      if (image) {
        image.mv('./public/admin/productimage/' + id + '.jpg')
      } if (image2) {
        image2.mv('./public/admin/productimage/' + id + '2.jpg')
      } if (image3) {
        image3.mv('./public/admin/productimage/' + id + '3.jpg')
      }
    }).catch((err) => {
      console.log('error in edit image', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in edit image', err);
    res.redirect('/admin/404')
  }
});


// ============================= Category ====================== //

router.get('/category', verifyAdmin, (req, res) => {
  try {
    producthelpers.GetallCategory().then((category) => {
      console.log(category);
      res.render('admin/category', { admin: true, layout: "admin-layout", category, catErr: req.session.catErr })
      req.session.catErr = null
    }).catch((err) => {
      console.log('error in view category', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in view category', err);
    res.redirect('/admin/404')
  }
});

router.get('/addcategory', verifyAdmin, (req, res) => {
  res.render('admin/add-category', { admin: true, layout: "admin-layout", "Errcategory": req.session.Errcategory })
  req.session.Errcategory = false
});

router.post('/addcategory', verifyAdmin, (req, res) => {
  try {
    producthelpers.addCategory(req.body).then(() => {
      res.redirect('/admin/category')
    }).catch((error) => {
      req.session.Errcategory = true
      res.redirect('/admin/addcategory')
    })
  } catch(err) {
    console.log('error in add category', err);
    res.redirect('/admin/404')
  }
});

router.get('/delete-Category/:id', verifyAdmin, (req, res) => {
  try {
    producthelpers.deleteCategory(req.params.id).then(() => {
      res.redirect('/admin/category')
    }).catch((error) => {
      req.session.catErr = error
      res.redirect('/admin/category')
    })
  } catch (err) {
    console.log('error in delete catgeory', err);
    res.redirect('/admin/404')
  }
})


router.get('/edit-Category/:id',verifyAdmin, async (req, res) => {
  let category = await producthelpers.getCategorydetails(req.params.id)
  res.render('admin/edit-category', { admin: true, layout: "admin-layout", category })
})

router.post('/edit-Category/:id', (req, res) => {
  try {
    producthelpers.updateCategory(req.params.id, req.body).then(() => {
      res.redirect('/admin/category')
    })
  } catch (err) {
    console.log('error in edit category', err);
    res.redirect('/admin/404')
  }
})

// ============================= User details ====================== //

router.get('/all-users', verifyAdmin, (req, res) => {
  try {
    producthelpers.getAllUsers().then((users) => {
      console.log(users);
      res.render('admin/view-user', { admin: true, layout: "admin-layout", users })
    }).catch((err) => {
      console.log('error in users', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in users', err);
    res.redirect('/admin/404')
  }
});


router.get('/block-User/:id', (req, res) => {
  adminhelpers.blockUser(req.params.id).then(() => {
    res.redirect('/admin/all-users')
  })
})

router.get('/Unblock-User/:id', (req, res) => {
  adminhelpers.UnblockUser(req.params.id).then(() => {
    res.redirect('/admin/all-users')
  })
});

// ============================= Orders ====================== //

router.get('/vieworders', verifyAdmin, async (req, res) => {
  const perPage = 5;
  let pageNum;
  let skip;
  let productCount;
  let pages;
  pageNum = parseInt(req.query.page) >= 1 ? parseInt(req.query.page) : 1;
  skip = (pageNum - 1) * perPage
  await userhelpers.getOrderCount().then((count) => {
    productCount = count;
  })
  pages = Math.ceil(productCount / perPage)
  let index = parseInt(skip) >= 1 ? skip + 1 : 1
  Handlebars.registerHelper("inc", function (value, options) {
    return parseInt(value) + index;
  });

  Handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
  });
  Handlebars.registerHelper('for', function (from, to, incr, block) {
    var accum = '';
    for (var i = from; i <= to; i += incr)
      accum += block.fn(i);
    return accum;
  });
  try {
    adminhelpers.getPaginatedOrders(perPage, skip).then((orders) => {
      res.render('admin/ordersadmin', { admin: true, layout: "admin-layout", orders, totalDoc: productCount, currentPage: pageNum, pages: pages })
    }).catch((err) => {
      console.log('error in add image', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in add image', err);
    res.redirect('/admin/404')
  }

})


router.get('/view-orderedProducts/:id',verifyAdmin, async (req, res) => {
  let products = await userhelpers.getOrderproducts(req.params.id)
  res.render('admin/orderproducts', { admin: true, layout: "admin-layout", products })
})

router.get('/view-orderusers/:id',verifyAdmin, async (req, res) => {
  let user = await adminhelpers.getOrderuser(req.params.id)
  res.render('admin/vieworderuser', { admin: true, layout: "admin-layout", user })

});

router.post('/changeStatus', (req, res) => {
  try {
    adminhelpers.changeStatus(req.body).then((response) => {
      res.json(response)

    }).then((err) => {
      console.log('error in change status', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in change status', err);
    res.redirect('/admin/404')
  }
});

// ============================= Offer ====================== //

router.get('/offer', verifyAdmin, async (req, res) => {

  let category = await producthelpers.GetallCategory(req.body)
  let categoryOffer = await producthelpers.getCatOffers()
  let products = await producthelpers.getAllproducts()
  try {
    await producthelpers.getProOffers().then((proOffer) => {
      res.render('admin/offer', { admin: true, layout: "admin-layout", category, categoryOffer, proOffer, products })
    }).catch((err) => {
      console.log('error in offer', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in offer', err);
    res.redirect('/admin/404')
  }
})

router.post('/addCategoryoffer', verifyAdmin, async (req, res) => {
  req.body.OfferPer = parseInt(req.body.OfferPer)
  try {
    await producthelpers.CreateCatOffer(req.body).then(async (data) => {
      await producthelpers.applyCatOffer(req.body)
      res.redirect('/admin/offer')
    }).catch((err) => {
      console.log('error in add catoff', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in add catoff', err);
    res.redirect('/admin/404')
  }
})

router.post('/addProductoffer', verifyAdmin, async (req, res) => {
  req.body.ProOfferper = parseInt(req.body.ProOfferper)
  try {
    await producthelpers.CreateProOffer(req.body).then(async () => {
      res.redirect('/admin/offer')
    }).catch((err) => {
      console.log('error in add prooff', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in add prooff', err);
    res.redirect('/admin/404')
  }
})


router.post('/applyOffer', async (req, res) => {
  try {
    await producthelpers.applyProOffer(req.body).then(() => {
      res.redirect('/admin/offer')
    }).catch((err) => {
      console.log('error in add applyoff', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in add apploff', err);
    res.redirect('/admin/404')
  }
})

router.post('/deleteProOffer', (req, res) => {
  try {
    producthelpers.deleteProoffer(req.body).then(() => {
      res.json(response)
    }).catch((err) => {
      console.log('error in delet prooff', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in delete prooff', err);
    res.redirect('/admin/404')
  }
})

router.post('/deleteOffer', (req, res) => {
  try {
    producthelpers.deleteOffer(req.body).then((response) => {
      res.json(response)
    }).catch((err) => {
      console.log('error in delete off', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in delte off', err);
    res.redirect('/admin/404')
  }
})


// ============================= Coupon ====================== //

router.get('/coupon',verifyAdmin, async (req, res) => {
  let coupon = await producthelpers.getAllCoupons()
  res.render('admin/coupon', { admin: true, layout: "admin-layout", couponErr: req.session.couponerr, coupon })
  req.session.couponerr = null
})

router.post('/addCoupon', verifyAdmin, (req, res) => {
  req.body.couponOfferper = parseInt(req.body.couponOfferper)
  req.body.min = parseInt(req.body.min)
  req.body.max = parseInt(req.body.max)
  try {
    producthelpers.addCoupon(req.body).then(() => {
      res.redirect('/admin/coupon')
    }).catch((error) => {
      req.session.couponerr = error
      res.redirect('/admin/coupon')

    })
  } catch (err) {
    console.log('error in add coupon', err);
    res.redirect('/admin/404')
  }
})

router.post('/deleteCoupon', (req, res) => {
  try {
    producthelpers.deleteCoupon(req.body).then((response) => {
      res.json(response)
    }).catch((err) => {
      console.log('error in delte coupon', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in delete coupon', err);
    res.redirect('/admin/404')
  }
})

// ==================================== Banner ====================================== //

router.get('/banner', verifyAdmin, (req, res) => {
  try {
    adminhelpers.getAllbanners().then((banner) => {
      res.render('admin/banner', { admin: true, layout: "admin-layout", banner })
    }).catch((err) => {
      console.log('error in banner', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in add banner', err);
    res.redirect('/admin/404')
  }
})

router.get('/addbanner',verifyAdmin,(req,res)=>{
  res.render('admin/addbanner',{ admin: true, layout: "admin-layout"})
})

router.post('/addbanner', verifyAdmin, (req, res) => {
  try {
    adminhelpers.addBanner(req.body).then((id) => {
      let image = req.files.image
      image.mv('./public/admin/bannerimage/' + id + '.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/addbanner')
        } else {
          console.log(err);
        }
      })
    }).catch((err) => {
      console.log('error in add banner', err);
      res.redirect('/admin/404')
    })
  } catch (err) {
    console.log('error in add banner', err);
    res.redirect('/admin/404')
  }
})

router.get('/deactivate/:id',(req,res)=>{
  adminhelpers.deactiveBanner(req.params.id).then(()=>{
    res.redirect('/admin/banner')
  })
})


router.get('/activate/:id',(req,res)=>{
  adminhelpers.activeBanner(req.params.id).then(()=>{
    res.redirect('/admin/banner')
  })
})



module.exports = router;
