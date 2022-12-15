const imagebox1 = document.getElementById('screen1')
const crop_btn1 = document.getElementById('crop-1')
const input1 = document.getElementById('imgFile1')
document.getElementById("addbtn").disabled = false;

//function viewImage1(event) {
//var fileInput1 = document.getElementById('imgFile1');
//var filePath1 = fileInput1.value;
//var allowedExtensions = /(\.jpg|\.png|\.jpeg|\.JPEG|\.webp)$/i;
//if (!allowedExtensions.exec(filePath1)) {
//  fileInput1.value = '';
//  swal("There is a problem!", "Please choose image file.");
//  return false;
//} else {
//  document.getElementById('imgView').src = URL.createObjectURL(event.target.files[0])
//}
//}

input1.addEventListener('change', () => {
    const img_data1 = input1.files[0]
    const url1 = URL.createObjectURL(img_data1)
    imagebox1.innerHTML = `<img src="${url1}" id="img1" style="width:100%;">`
    const img1 = document.getElementById('img1')
    document.getElementById("addbtn").disabled = true;
    document.getElementById('screen1').style.display = 'block'
    document.getElementById('crop-1').style.display = 'block'
    document.getElementById('image-1').style.display = 'block'

    const cropper1 = new Cropper(img1, {
        autoCropArea: 1,
        viewMode: 1,
        scalable: false,
        zoomable: false,
        movable: false,
        minCropBoxWidth: 50,
        minCropBoxHeight: 50,
        aspectRatio: 1 / 1,
    })

    crop_btn1.addEventListener('click', () => {

        cropper1.getCroppedCanvas().toBlob((blob) => {
            let fileInputElement1 = document.getElementById('imgFile1');
            let file1 = new File([blob], img_data1.name, { type: "image/*", lastModified: new Date().getTime() });
            let container1 = new DataTransfer();
            container1.items.add(file1);
            fileInputElement1.files = container1.files;
            document.getElementById('image-1').src = URL.createObjectURL(fileInputElement1.files[0])
            document.getElementById('screen1').style.display = 'none'
            document.getElementById('crop-1').style.display = 'none'
            document.getElementById("addbtn").disabled = false;
        })
    })

})

// ----------------

const imagebox2 = document.getElementById('screen2')
const crop_btn2 = document.getElementById('crop-2')
const input2 = document.getElementById('imgFile2')
document.getElementById("addbtn").disabled = false;


input2.addEventListener('change', () => {
    const img_data2 = input2.files[0]
    const url2 = URL.createObjectURL(img_data2)
    imagebox2.innerHTML = `<img src="${url2}" id="img2" style="width:100%;">`
    const img2 = document.getElementById('img2')
    document.getElementById("addbtn").disabled = true;
    document.getElementById('screen2').style.display = 'block'
    document.getElementById('crop-2').style.display = 'block'
    document.getElementById('image-2').style.display = 'block'

    const cropper2 = new Cropper(img2, {
        autoCropArea: 1,
        viewMode: 1,
        scalable: false,
        zoomable: false,
        movable: false,
        minCropBoxWidth: 50,
        minCropBoxHeight: 50,
        aspectRatio: 1 / 1,
    })

    crop_btn2.addEventListener('click', () => {

        cropper2.getCroppedCanvas().toBlob((blob) => {
            let fileInputElement2 = document.getElementById('imgFile2');
            let file2 = new File([blob], img_data2.name, { type: "image/*", lastModified: new Date().getTime() });
            let container2 = new DataTransfer();
            container2.items.add(file2);
            fileInputElement2.files = container2.files;
            document.getElementById('image-2').src = URL.createObjectURL(fileInputElement2.files[0])
            document.getElementById('screen2').style.display = 'none'
            document.getElementById('crop-2').style.display = 'none'
            document.getElementById("addbtn").disabled = false;
        })
    })

})


getAllorders: () => {
    return new Promise((resolve, reject) => {
        db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((orders) => {
            resolve(orders)
        })
    })
}