var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const Razorpay = require('razorpay');
const { use, unsubscribe } = require('../routes/users')
const { ObjectID } = require('bson')
const { response } = require('express')
var moment = require('moment')
const paypal = require('paypal-rest-sdk')
const {
    v1: uuidv1,
    v4: uuidv4,
} = require('uuid');

var instance = new Razorpay({
    key_id: 'rzp_test_XJCuMB71OKgGb7',
    key_secret: 'IudyKFskEFUNbPotudavXZOS',
});

uuidv1(); // -> '6c84fb90-12c4-11e1-840d-7b25c5ee775a' 
uuidv4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1' 




module.exports = {

// =============================Login & signup======================

    doSignup: (Userdata) => {

        return new Promise(async (resolve, reject) => {

            emailExist = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: Userdata.email });

            if (emailExist) {
                reject("email exist.");
            }
            else {
                phonenumberExist = await db.get().collection(collection.USER_COLLECTION).findOne({ phonenumber: Userdata.phone });
                // console.log(phonenumberExist);
                if (phonenumberExist) {
                    reject("Phonenumber exist");
                } else {
                    Userdata.address = []
                    Userdata.password = await bcrypt.hash(Userdata.password, 10)
                    db.get().collection(collection.USER_COLLECTION).insertOne({ Firstname: Userdata.firstname, Lastname: Userdata.lastname, phonenumber: Userdata.phone, Email: Userdata.email, password: Userdata.password }).then(async(userDetails)=>{
                        db.get().collection(collection.WALLET_COLLECTION).insertOne({
                            user:userDetails.insertedId,
                            amount:0.00,
                            transactions:[]
                        })
                        resolve(response);
                    })
                    

                }
            }

        });

    },

    doLogin: (Userdata) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: Userdata.Clientemail });
            console.log(user);
            if (user) {
                let loginstatus = false
                let response = {}
                bcrypt.compare(Userdata.Clientpassword, user.password).then((status) => {
                    if (status) {
                        console.log("login success");
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("login failed");
                        resolve({ status: false });
                    }
                })
            } else {
                console.log("failed");
                resolve({ status: false });
            }
        })
    },

    isLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let blockUser = await db.get().collection(collection.USER_COLLECTION).findOne({ $and: [{ _id: ObjectID(userData) }, { isBlocked: true }] })
            console.log(blockUser);
            if (blockUser) {
                reject('user blocked')
            } else {
                resolve();
            }
        })
    },

    // ============================= products ======================
    
    displayProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    getCategoryproducts: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).find({ categoryName: catId }).toArray().then((products) => {
                resolve(products)
            })
        })
    },


    productDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectID(proId) }).then((product) => {
                resolve(product)
            })
        })

    },

    // ============================= Cart ======================

    addtoCart: (proID, userId) => {
        return new Promise(async (resolve, reject) => {
            let proObj = {
                item: ObjectID(proID),
                quantity: 1
            }
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectID(userId) })
            if (userCart) {
                let productExist = userCart.products.findIndex(product => product.item == proID)

                if (productExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: ObjectID(userId), 'products.item': ObjectID(proID) }, { $inc: { 'products.$.quantity': 1 } }).then(() => {
                        resolve()
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: ObjectID(userId) }, { $push: { products: proObj } }).then((response) => {
                        resolve()
                    })
                }
            } else {
                let cartObj = {
                    user: ObjectID(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve
                })
            }
        })
    },

    getcartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {

            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectID(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:
                    {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            console.log('hey heyh hey');
            resolve(cartItems)
        })
    },

    getcartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectID(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },

    changeproductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: ObjectID(details.cart) },
                        {
                            $pull: { products: { item: ObjectID(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeproduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({
                        _id: ObjectID(details.cart),
                        'products.item': ObjectID(details.product)
                    },
                        { $inc: { 'products.$.quantity': details.count } })
                    .then((response) => {
                        resolve({ status: true })
                    })
            }

        })
    },

    deletecartProduct: (cartid) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: ObjectID(cartid.cart) },
                {
                    $pull: { products: { item: ObjectID(cartid.product) } }
                }
            ).then((response) => {
                resolve({ removeproduct: true })
            })
        })
    },


    getcartProductlist: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectID(userId) })


            resolve(cart.products)
        })
    },

    // ============================= total ======================

    getTotalprice: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectID(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:
                    {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.MRP'] } }
                    }
                }
            ]).toArray()

            resolve(total[0].total)
        })
    },

    // ============================= CheckOut ======================

    placeOrder: (order, address, products, total) => {
        return new Promise(async (resolve, reject) => {

            let uniqueId = uuidv4();
            let status = order.paymentMethod === 'COD'||order.paymentMethod ==='wallet' ? 'placed' : 'pending'
            let orderObj = {
                deliverydetails: {
                    name: address.name,
                    number: address.number,
                    email: address.email,
                    address: address.address,
                    city: address.city,
                    uniID: uniqueId,
                    state: address.state,
                    pinCode: address.pinCode,


                },
                userId: ObjectID(order.userId),
                paymentMethod: order.paymentMethod,
                products: products,
                totalAmount: total,
                status: status,
                date: moment().format("MMM Do YY")

            }
            await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: ObjectID(order.userId) })
                resolve(response.insertedId)
            })
        })
    },

   
    // ============================= Orders ======================

    getallOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: ObjectID(userId) }).toArray()

            resolve(orders.reverse())
        })
    },

    getOrderproducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectID(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:
                    {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()

            resolve(orders)
        })
    },

    cancelOrders: (orderId) => {
        return new Promise(async (resolve, reject) => {

            let user=await db.get().collection(collection.ORDER_COLLECTION).find({_id:ObjectID(orderId)}).toArray()
            console.log(user,'heheheh1');
            let userID=user[0].userId
            let total=user[0].totalAmount
            let payment=user[0].paymentMethod
            let date = new Date().toLocaleString('en-US')
            if(payment!='COD'){
                db.get().collection(collection.WALLET_COLLECTION).updateOne({user:userID},
                    {
                        $inc:{amount:total},
                        $push:{
                            transactions:{
                                transactiondescription:'order cancelled',
                                transactionsAmount:total,
                                type:'credited',
                                transactionDate:date
                            }
                        }
                    })
            }
          

            await db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: ObjectID(orderId) },
                    {
                        $set: { status: 'cancelled' }
                    }).then(() => {
                        resolve()
                    })
        })
    },

    getOrder:(orderId)=>{
        return new Promise(async(resolve, reject) => {
        let order=await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:ObjectID(orderId)})
        resolve(order)
        })
    },

    returnOrder:(orderId)=>{
      return new Promise(async(resolve, reject) => {
        await db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({ _id: ObjectID(orderId) },
            {
                $set: { status: 'Return requested' }
            }).then(() => {
                resolve()
            })
      })
    },

    // ============================= Address ======================

    getUserAddress: (userId, addressKey) => {
        return new Promise(async (resolve, reject) => {
            console.log(addressKey, 'adresskeykey');
            let data = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectID(userId) }
                },
                {
                    $unwind: '$address'
                },
                {
                    $project: {
                        uniID: '$address.uniID',
                        name: '$address.name',
                        number: '$address.number',
                        email: '$address.email',
                        address: '$address.address',
                        city: '$address.city',
                        state: '$address.state',
                        pinCode: '$address.pinCode'

                    }
                },
                {
                    $match: { uniID: addressKey }
                }
            ]).toArray()
            let address1 = data[0]
            resolve(address1)
        })
    },

    addAddressfromOrder: (address, user) => {
        return new Promise(async (resolve, reject) => {
            let addressDetails = {}

            addressDetails.firstname = address.Firstname
            addressDetails.lastname = address.Lastname
            addressDetails.number = address.Phone
            addressDetails.email = address.Email
            addressDetails.address = address.address
            addressDetails.city = address.city
            addressDetails.uniID = uuidv4();
            addressDetails.state = address.state
            addressDetails.pinCode = address.pinCode

            await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectID(user._id) }, { $push: { address: addressDetails } })
            resolve()
            console.log(addressDetails, 'hey adrressdetails');
        })
    },

    getUserdetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectID(userId) }).then((users) => {
                resolve(users)
            })

        })
    },

    getAlladdress: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log('hey address');
            let address = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectID(userId) }
                },
                {
                    $unwind: '$address'
                },
                {
                    $project: {
                        uniID: '$address.uniID',
                        firstname: '$address.firstname',
                        lastname: '$address.lastname',
                        number: '$address.number',
                        email: '$address.email',
                        address: '$address.address',
                        city: '$address.city',
                        state: '$address.state',
                        pinCode: '$address.pinCode'

                    }
                }
            ]).toArray()
            console.log(address, 'hey address1');
            resolve(address)
        })
    },

    addAddress: (address, user) => {

        return new Promise(async (resolve, reject) => {
            let addressDetails = {}

            addressDetails.firstname = address.Firstname
            addressDetails.lastname = address.Lastname
            addressDetails.number = address.Phone
            addressDetails.email = address.Email
            addressDetails.address = address.address
            addressDetails.city = address.city
            addressDetails.uniID = uuidv4();
            addressDetails.state = address.state
            addressDetails.pinCode = address.pinCode

            await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectID(user._id) }, { $push: { address: addressDetails } })
            resolve()
            console.log(addressDetails, 'hey adrressdetails');
        })
    },

    deleteAddress: (AdddressId, user) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectID(user._id) }, { $pull: { address: { uniID: AdddressId } } })
            resolve()
        })

    },

    getProfileaddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectID(userId) }
                },
                {
                    $unwind: '$address'
                },
                {
                    $project: {
                        uniID: '$address.uniID',
                        firstname: '$address.firstname',
                        lastname: '$address.lastname',
                        number: '$address.number',
                        email: '$address.email',
                        address: '$address.address',
                        city: '$address.city',
                        state: '$address.state',
                        pinCode: '$address.pinCode'

                    }
                }
            ]).toArray()
            resolve(address)
        })
    },

    userDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectID(userId) }).then((user) => {
                resolve(user)
            })
        })
    },

    updateUser: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectID(userId) },
                {
                    $set: {
                        Firstname: userDetails.firstname,
                        Lastname: userDetails.lastname,
                        phonenumber: userDetails.number,
                        Email: userDetails.email
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },


    // ============================= Wish list ======================

    addtoWishlist: (proID, userId) => {
        return new Promise(async (resolve, reject) => {
            let proObj = {
                item: ObjectID(proID),
                quantity: 1
            }
            let userWishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: ObjectID(userId) })
            if (userWishlist) {
                let productExist = userWishlist.products.findIndex((product => product.item == proID))
                if (productExist != -1) {
                    db.get().collection(collection.WISHLIST_COLLECTION)
                        .updateOne({ user: ObjectID(userId) },
                            { $pull: { products: { item: ObjectID(proID) } } })
                        .then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.WISHLIST_COLLECTION)
                        .updateOne({ user: ObjectID(userId) },
                            { $push: { products: proObj } })
                        .then((response) => {
                            resolve(response)
                        })
                }
            } else {
                let wishlistObj = {
                    user: ObjectID(userId),
                    products: [proObj]
                }
                db.get().collection(collection.WISHLIST_COLLECTION)
                    .insertOne(wishlistObj)
                    .then((response) => {
                        resolve(response)
                    })
            }
        })
    },

    getwishlistProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlistItems = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                {
                    $match: { user: ObjectID(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:
                    {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            console.log(wishlistItems, 'hey wish');
            resolve(wishlistItems)
        })
    },

    deleteWishPro: (wishProid) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ _id: ObjectID(wishProid.wishList) },
                {
                    $pull: { products: { item: ObjectID(wishProid.product) } }
                })
                .then((response) => {
                    resolve({ removeproduct: true })
                })
        })
    },

// ============================= Payment ======================

    generateRazorpay: (orderId, totalprice) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: totalprice * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log("hey order:", order);
                resolve(order)
            });
        })
    },

    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            var crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'IudyKFskEFUNbPotudavXZOS')

            hmac.update(details['Payment[razorpay_order_id]'] + '|' + details['Payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['Payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },

    changePaymentstatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectID(orderId) },
                {
                    $set: { status: 'placed' }
                }).then(() => {
                    resolve()
                })
        })
    },


    createPay: (payment) => {
        return new Promise((resolve, reject) => {
            paypal.payment.create(payment, function (err, payment) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(payment);
                }
            });
        });
    },



    // ============================= Copuon ======================

    couponOffer:(details)=>{
        let response={}
        return new Promise(async(resolve, reject) => {
            let couponCheck=await db.get().collection(collection.COUPON_COLLECTION).findOne({couponName:details.promoCode})
            let check={}
            if(couponCheck){
                if(couponCheck.min<details.total){
                   
                    let price=parseInt((details.total/100)*couponCheck.couponOfferper)
                    let couponOffer=details.total-price
                    response.discPrice=couponOffer
                    response.price=price
                    response.coupon=couponCheck.couponName
                    resolve(response)

                }else{
                    console.log('errr');
                    check.couponErr=true;
                    check.couponmin=couponCheck.min
                    resolve(check)
                }
            }else{
                console.log('errr');
                check.couponErr1=true;
                    resolve(check)
            }
        })
    },

    promoOffer:(couponName,total)=>{
        return new Promise(async(resolve, reject) => {
            let coupon=await db.get().collection(collection.COUPON_COLLECTION).findOne({couponName:couponName})
            let price=parseInt(total/100)*coupon.couponOfferper
            resolve(price)
        })
    },


    // ============================= Wallet ======================

    getWallet:(userId)=>{
        return new Promise(async(resolve, reject) => {
            let wallet=await db.get().collection(collection.WALLET_COLLECTION).findOne({user:ObjectID(userId)})
            resolve(wallet)
        })
    },

    useWallet:(userId,totalprice)=>{
        
        return new Promise((resolve, reject) => {
            let date = new Date().toLocaleString('en-US')
            db.get().collection(collection.WALLET_COLLECTION).updateOne({user:ObjectID(userId)},{
                $inc:{amount:-totalprice},
                $push:{
                    transactions:{
                        transactiondescription:'product ordered',
                        transactionsAmount:totalprice,
                        type:'debited',
                        transactionDate:date
                    }
                }
            })
        })
    }

    //=====================================================================//

}