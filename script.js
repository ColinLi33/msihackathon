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
    //rows[rowNum - 1].getElementsByClassName[leftOrRight][0].append(newPC);
    if (leftOrRight === "left"){
        rows[rowNum - 1].children[0].append(newPC);
    }else{
        rows[rowNum - 1].children[1].append(newPC);
    }
}
addPC(2, "C8", "left", "available");