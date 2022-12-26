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