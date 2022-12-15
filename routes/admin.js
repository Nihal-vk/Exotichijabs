var express = require('express');
var router = express.Router();
var producthelpers = require('../helpers/producthelpers')
var adminhelpers = require('../helpers/adminhelpers')
// const multer = require('multer');
const userhelpers = require('../helpers/userhelpers');

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, '/admin/productimage')
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//   }
// })

// var upload = multer({ storage: storage })



const Dbemail = "admin01@gmail.com";
const Dbpassword = "12345";


/* GET users listing. */
router.get('/', async function (req, res, next) {
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

});


router.post('/', (req, res) => {
  const admindata = { adminemail, adminpassword } = req.body

  if (adminemail === Dbemail && adminpassword === Dbpassword) {

    req.session.loggedIn = true
    req.session.admin = admindata
    res.redirect('/admin/')

  } else {
    req.session.logedErr = true
    res.redirect('/admin/')
  }
})


// router.get('/home', (req, res, next) => {
//   let admin = req.session.admin
//   if (admin) {
//     res.render('admin/dashboard', { admin: true, layout: "admin-layout" });
//   }
//   else {
//     res.render('admin/admin-login');
//   }
// });

router.get('/addproduct', async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  res.render('admin/addproducts', { admin: true, layout: "admin-layout", category })
});


router.post('/addproduct', (req, res, next) => {
  let productData = {}
  productData.MRP = 0
  productData = req.body
  productData.price = parseInt(req.body.price)
  productData.stock = parseInt(req.body.stock)
  productData.MRP = parseInt(req.body.price)

  producthelpers.addProduct(productData).then(async (id) => {

    let category = await producthelpers.GetallCategory(req.body)
    let image = req.files.image
    let image2 = req.files.image2
    let image3 = req.files.image3
    image.mv('./public/admin/productimage/' + id + '.jpg')
    image2.mv('./public/admin/productimage/' + id + '2.jpg')
    image3.mv('./public/admin/productimage/' + id + '3.jpg', (err, done) => {
      if (!err) {
        res.redirect('/admin/addproduct')
      } else {
        console.log(err);
      }
    })

  })

});

router.get('/products', (req, res) => {
  producthelpers.getAllproducts().then((products) => {
    res.render('admin/products', { admin: true, layout: "admin-layout", products })

  })

});


router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id
  producthelpers.deleteProducts(proId)
    .then((response) => {
      res.redirect('/admin/products')
    })
});

router.get('/edit-product/:id', async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  let product = await producthelpers.getAllproductdetails(req.params.id)
  console.log(product);
  res.render('admin/edit-products', { admin: true, layout: "admin-layout", product, category })
});


router.post('/edit-product/:id', (req, res) => {
  req.body.price = parseInt(req.body.price)
  req.body.stock = parseInt(req.body.stock)
  let id = req.params.id
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
  })
});


router.get('/category', (req, res) => {
  producthelpers.GetallCategory().then((category) => {
    console.log(category);
    res.render('admin/category', { admin: true, layout: "admin-layout", category, catErr: req.session.catErr })
    req.session.catErr = null
  })

});

router.get('/addcategory', (req, res) => {
  res.render('admin/add-category', { admin: true, layout: "admin-layout", "Errcategory": req.session.Errcategory })
  req.session.Errcategory = false
});

router.post('/addcategory', (req, res) => {
  console.log('hi');
  console.log(req.body);
  producthelpers.addCategory(req.body).then(() => {
    res.redirect('/admin/category')
  }).catch((error) => {
    req.session.Errcategory = true
    res.redirect('/admin/addcategory')
  })
});

router.get('/delete-Category/:id', (req, res) => {


  producthelpers.deleteCategory(req.params.id).then(() => {
    console.log("12");
    console.log(req.params.id);
    res.redirect('/admin/category')
  }).catch((error) => {
    req.session.catErr = error
    res.redirect('/admin/category')
  })
})


router.get('/edit-Category/:id', async (req, res) => {
  let category = await producthelpers.getCategorydetails(req.params.id)
  res.render('admin/edit-category', { admin: true, layout: "admin-layout", category })
})

router.post('/edit-Category/:id', (req, res) => {
  producthelpers.updateCategory(req.params.id, req.body).then(() => {
    res.redirect('/admin/category')
  })
})

router.get('/all-users', (req, res) => {

  producthelpers.getAllUsers().then((users) => {
    console.log(users);
    res.render('admin/view-user', { admin: true, layout: "admin-layout", users })
  })
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


router.get('/vieworders', async (req, res) => {
  adminhelpers.getAllorders().then((orders) => {
    res.render('admin/ordersadmin', { admin: true, layout: "admin-layout", orders })
  })

})


router.get('/view-orderedProducts/:id', async (req, res) => {
  let products = await userhelpers.getOrderproducts(req.params.id)
  res.render('admin/orderproducts', { admin: true, layout: "admin-layout", products })
})

router.get('/view-orderusers/:id', async (req, res) => {
  let user = await adminhelpers.getOrderuser(req.params.id)
  console.log('hejeje');
  console.log(user);
  res.render('admin/vieworderuser', { admin: true, layout: "admin-layout", user })

});

router.post('/changeStatus', (req, res) => {
  console.log('api call');
  console.log(req.body);
  adminhelpers.changeStatus(req.body).then((response) => {
    res.json(response)

  })
});

router.get('/offer', async (req, res) => {
  let category = await producthelpers.GetallCategory(req.body)
  res.render('admin/offer', { admin: true, layout: "admin-layout", category })
})


router.get('/adminlogout', (req, res) => {
  req.session.loggedIn = false;
  res.redirect('/admin')
});




module.exports = router;
