var db = require('../config/connection')
var collection = require('../config/collection')
const { response } = require('express')
const { ReturnDocument } = require('mongodb')
var objectId = require('mongodb').ObjectId

module.exports = {
    addProduct: (product) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
                // console.log(data.insertedId)
                resolve(data.insertedId)
            })

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

    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(user)
        })
    },


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



}