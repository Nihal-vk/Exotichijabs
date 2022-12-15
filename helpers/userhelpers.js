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
                    db.get().collection(collection.USER_COLLECTION).insertOne({ Firstname: Userdata.firstname, Lastname: Userdata.lastname, phonenumber: Userdata.phone, Email: Userdata.email, password: Userdata.password })
                    resolve();

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


    productDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectID(proId) }).then((product) => {
                resolve(product)
            })
        })

    },

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
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray()
            resolve(total[0].total)
        })
    },

    placeOrder: (order, address, products, total) => {
        return new Promise(async (resolve, reject) => {
            console.log('hey hey hye hye');
            console.log(address);
            let uniqueId = uuidv4();
            let status = order.paymentMethod === 'COD' ? 'placed' : 'pending'
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


            // await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectID(order.userId) }, { $push: { address: orderObj.deliverydetails } }).then(() => {
            //     resolve()
            // })
            await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: ObjectID(order.userId) })
                resolve(response.insertedId)
            })
        })
    },

    getcartProductlist: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectID(userId) })


            resolve(cart.products)
        })
    },

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
            await db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: ObjectID(orderId) },
                    {
                        $set: { status: 'cancelled' }
                    }).then(() => {
                        resolve()
                    })
        })
    },


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

            addressDetails.name = address.name
            addressDetails.number = address.number
            addressDetails.email = address.email
            addressDetails.address = address.address
            addressDetails.city = address.city
            addressDetails.uniID = uuidv4();
            addressDetails.state = address.state
            addressDetails.pinCode = address.pinCode

            await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectID(user._id) }, { $push: { address: addressDetails } })
            resolve()
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
                        name: '$address.',
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

    addAddress: (address, user) => {

        return new Promise(async (resolve, reject) => {
            address.uniID = uuidv4();
            console.log(address, 'hello mwonj');

            await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectID(user._id) }, { $push: { address: address } })
            resolve()
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
                        firstname: '$address.Firstname',
                        lastname: '$address.Lastname',
                        number: '$address.Phone',
                        email: '$address.Email',
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
    }



}