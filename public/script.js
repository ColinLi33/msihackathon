function addRow(){
   let area = document.getElementById("Seats");
   let newRow = document.createElement("div");
   let left = document.createElement("div");
   left.classList.add("Left");
   let right = document.createElement("div");
   right.classList.add("Right");
   newRow.appendChild(left);
   newRow.appendChild(right);
   newRow.classList.add("Row");
   area.appendChild(newRow);
}
function addPC(rowNum, name, leftOrRight, currentStatus){
    let rows = document.getElementsByClassName("Row");
    let newPC = document.createElement("div");
    newPC.classList.add("PC");
    newPC.classList.add(currentStatus);
    newPC.textContent = name;
    if (leftOrRight === "left"){
        rows[rowNum - 1].children[0].append(newPC);
    }else{
        rows[rowNum - 1].children[1].append(newPC);
    }
}

function changeStatus(pcName, newStatus){
    let PCs = document.getElementsByClassName("PC");
    for (let i = 0; i < PCs.length; i++){
        if(PCs[i].innerText === pcName){
            PCs[i].classList.remove("Used");
            PCs[i].classList.remove("OutOfOrder");
            PCs[i].classList.remove("Available");
            PCs[i].classList.add(newStatus);        
        }
    }
};
