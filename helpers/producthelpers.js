var db = require('../config/connection')
var collection = require('../config/collection')
const { response } = require('express')
const { ReturnDocument } = require('mongodb')
var objectId = require('mongodb').ObjectId

module.exports = {
    // ============================= product ======================  //

    addProduct: (product) => {
        return new Promise((resolve, reject) => {
            try{
                db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
                    // console.log(data.insertedId)
                    resolve(data.insertedId)
                })
            }catch(err){
                console.log(err);
            }
        })
    },

    getAllproducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },

    deleteProducts: (proId) => {

        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                resolve(response)
            })
        })
    },

    getAllproductdetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },

    updateProducts: (proId, productdetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, { $set: { productName: productdetails.productName, categoryName: productdetails.categoryName, price: productdetails.price, description: productdetails.description, stock: productdetails.stock } }).then((response) => {
                resolve()
            })
        })
    },

    getProductCount:()=>{
      return new Promise(async(resolve, reject) => {
        let count = await db.get().collection(collection.PRODUCT_COLLECTION).countDocuments()
        resolve(count)
      })
    },

    getPaginatedProducts:(skip,limit)=>{
     return new Promise(async(resolve, reject) => {
        let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().skip(skip).limit(limit).toArray()
            resolve(products)
     })
    },


    // ============================= Users ====================== //

    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(user)
        })
    },

    // ============================= Category ====================== //

    addCategory: (category) => {
        return new Promise(async (resolve, reject) => {
            let categoryExist = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ categoryName: category.categoryName })
            console.log(categoryExist);
            if (categoryExist) {
                reject('cateogry exist')
            } else {
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne({ categoryName: category.categoryName }).then(async (data) => {
                    resolve(data)
                })

            }
        })
    },

    GetallCategory: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).find().toArray().then((category) => {
                resolve(category);
            })

        })
    },

    deleteCategory: (catId) => {
        return new Promise(async (resolve, reject) => {
            isCategory = await db.get().collection(collection.PRODUCT_COLLECTION).find({ categoryName: catId }).toArray();
            if (isCategory.length == 0) {
                db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ categoryName: catId }).then((category) => {
                    resolve(category)
                })
            } else {
                let length = isCategory.length
                reject(`This category cant be deleted,it contain ${length} products`)
            }



        })
    },

    getCategorydetails: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(catId) }).then((category) => {
                resolve(category)
            })
        })

    },

    updateCategory: (catId, catDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: objectId(catId) },
                {
                    $set: {
                        categoryName: catDetails.categoryName
                    }
                }).then(() => {
                    resolve();
                })
        })
    },

    // ============================= Offer ====================== //

    CreateCatOffer: (offerDetails) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.OFFER_COLLECTION).insertOne(offerDetails).then((data) => {
                resolve(data)
            })
        })
    },

    applyCatOffer: (offerDetails) => {
        return new Promise(async (resolve, reject) => {
            console.log('api call');
            console.log(offerDetails, 'heyhey');
            await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ categoryName: offerDetails.categoryName },
                [
                    {
                        $set: { MRP: { $subtract: ['$price', { $floor: { $multiply: [{ $divide: [offerDetails.OfferPer, 100] }, '$MRP'] } }] } }
                    }
                ])

            resolve()
        })
    },

    getCatOffers: () => {
        return new Promise(async (resolve, reject) => {
            let catOffer = await db.get().collection(collection.OFFER_COLLECTION).find({ offerType: "category" }).toArray()
            resolve(catOffer)
        })
    },

    CreateProOffer: (offerDetails) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.OFFER_COLLECTION).insertOne(offerDetails).then((data) => {
                resolve(data)
            })
        })
    },

    getProOffers: () => {
        return new Promise(async (resolve, reject) => {
            let proOffer = await db.get().collection(collection.OFFER_COLLECTION).find({ offerType: "product" }).toArray()
            resolve(proOffer)
        })
    },

    applyProOffer: (offerDetails) => {
        return new Promise(async (resolve, reject) => {
            let offer = await db.get().collection(collection.OFFER_COLLECTION).findOne({ ProOffername: offerDetails.offername })
            let percentage = parseInt(offer.ProOfferper)
            let offerName = offer.ProOffername
            await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ _id: objectId(offerDetails.productID) },
                [
                    {
                        $set: {
                            MRP: { $subtract: ['$price', { $floor: { $multiply: [{ $divide: [percentage, 100] }, '$MRP'] } }] },
                            ProOffername: offerName
                        }
                    }
                ])
            resolve(response)
        })
    },


    deleteOffer: (details) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.OFFER_COLLECTION).deleteOne({ _id: objectId(details.offId) }).then(() => {
                resolve({ removeOffer: true })
            })

            await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ categoryName: details.category }, [
                {
                    $set: { MRP: '$price' }
                }
            ])
        })
    },

    deleteProoffer: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ ProOffername: details.offername }, [
                {
                    $set: { MRP: '$price' }
                },
                {
                    $unset: ['ProOffername']
                }
            ])

            db.get().collection(collection.OFFER_COLLECTION).deleteOne({ _id: objectId(details.offerId) }).then(() => {
                resolve({ status: true })
            })
        })
    },


    // ============================= Coupon ======================  //

    addCoupon: (couponDetails) => {
        return new Promise(async (resolve, reject) => {
            let couponExist = await db.get().collection(collection.COUPON_COLLECTION).findOne({ couponName: couponDetails.couponName })
            console.log(couponExist);
            if (couponExist) {
                console.log('hey coupon');
                reject("coupon exist")
            } else {
                db.get().collection(collection.COUPON_COLLECTION).insertOne(couponDetails).then(async (data) => {
                    resolve(data)
                })

            }
        })
    },

    getAllCoupons: () => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupon)
        })
    },

    deleteCoupon: (couponid) => {
        console.log(couponid,'hi');
        console.log('hey man',objectId(couponid.couponId));
        return new Promise(async(resolve, reject) => {
            await db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(couponid.couponId) }).then(() => {
                
                resolve({ removeCoupon: true })
            })
        })
    }

//=====================================================================//

}