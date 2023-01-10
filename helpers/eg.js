// router.get('/', async (req, res, next)=> {
//     try {
//       const perPage = 12;
//       let pageNum;
//       let skip;
//       let productCount;
//       let pages;
//       pageNum = parseInt(req.query.page);
//       console.log(typeof (pageNum))
//       skip = (pageNum - 1) * perPage
//       await productHelpers.getProductCount().then((count) => {
//         productCount = count;
//       })
//       pages = Math.ceil(productCount / perPage)
  
//       Handlebars.registerHelper('ifCond', function (v1, v2, options) {
//         if (v1 === v2) {
//           return options.fn(this);
//         }
//         return options.inverse(this);
//       });
//       Handlebars.registerHelper('for', function (from, to, incr, block) {
//         var accum = '';
//         for (var i = from; i <= to; i += incr)
//           accum += block.fn(i);
//         return accum;
//       });
  
//       let search = '';
//       if (req.query.search) {
//         search = req.query.search
  
//         productHelpers.getCategory().then((datacategory) => {
//           productHelpers.getSearchProducts(search).then(async (products) => {
//             if (req.session.user) {
//               cartCount = await userHelpers.getCartCount(req.session.user._id)
//               let user = req.session.user
//               res.render('user/home-page', { products, admin: false, user, datacategory, cartCount });
//             } else {
//               res.render('user/home-page', { products, admin: false, datacategory });
//             }
//           })
//         })
//       } else {
//         productHelpers.getBanner().then((banner) => {
//           productHelpers.getCategory().then((datacategory) => {
//             // let user=req.session.user
//             productHelpers.getPaginatedProducts(skip, perPage).then(async (products) => {
//               // productHelpers.getDiscountPercent().then(async(discountPercent)=>{
//               let cartCount = null;
//               if (req.session.user) {
//                 console.log(products.length);
//                 userHelpers.getWishlistProducts(req.session.user._id).then(async(data) => {
//                   console.log(data);
//                   console.log(data.length);
//                   for (let i = 0; i < products.length; i++) {
//                       for (let j = 0; j < data.length; j++) {
//                           if (products[i]._id.toString() == data[j].item.toString()) {
//                               products[i].isWishlisted = true;  
//                         }
//                       }
//                   }
//                   console.log(products);
//                   cartCount = await userHelpers.getCartCount(req.session.user._id)
//                   let user = req.session.user
//                   res.render('user/home-page', { products, admin: false, user, datacategory, cartCount, totalDoc: productCount, currentPage: pageNum, pages: pages, banner }); 
//                 }).catch((err)=>{
//                   console.log(err);
//                 })     
//               } else {
//                 res.render('user/home-page', { products, admin: false, datacategory, totalDoc: productCount, currentPage: pageNum, pages: pages, banner });
//               }
//               //  })
//             })
//           })
//         })
//       }
//     } catch (err) {
//       console.log(err + "error happened in home page");
//       res.redirect('/error')
//     }
//   });



//   getPaginatedProducts: (skip, limit) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({stock:{$gte:1}}).skip(skip).limit(limit).toArray()
//             resolve(products.reverse())
//         } catch (err) {
//             console.log(err);
//             reject(err)
//         }
//     })
// }


// Get Otp login Page
router.get('/otp-page', (req, res) => {
  req.session.otpSended = true;
  res.render('user/otp-page', { otpSended: req.session.otpSended })
})

//POST Send Otp To Twilio 
router.post('/sendotp', (req, res) => {
  console.log(req.body);
  userHelpers.checkUser(req.body).then((response) => {
    console.log(response);
    if (response.user) {
      let ph_no = (`+91${req.body.number}`)
      req.session.number = ph_no;
      client.verify.v2.services('VA4c79484d8cc30 SID')
        .verifications
        .create({ to: ph_no, channel: 'sms' })
        .then(verification => {
          console.log(verification.status)
          //  req.session.preuser=response.user
          req.session.user = response.user
          res.render('user/otp-page', { otpSend: true })
        })
    } else {
      res.render('user/otp-page', { noaccount: true })
    }
  })
})

router.post('/verifyotp', (req, res) => {
  // console.log(`session phone number is ${req.session.phonenumber} and otp is ${req.body}`);
  console.log(req.session.number);
  let ph_no = req.session.number
  let otp = req.body.otp
  client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
    .verificationChecks
    .create({ to: ph_no, code: otp })
    .then(verification_check => {
      console.log(verification_check.status)
      if (verification_check.status == 'approved') {
        // user=req.session.user
        // console.log('lo');
        // req.session.user=req.session.preuser

        res.redirect('/home')
      } else {
        res.render('user/otp-page', { otpErr: true })
      }
    });

})



checkUser: (userData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTIONS).findOne({ number: userData.number })
            if (user) {
                console.log(`user is ${user}`);
                response.user = user
                resolve(response)
            } else {
                console.log("user not found");
                resolve(response)
            }
        })
    }


   