import { Shot } from "./model.js";

export function setupTable(shots) {

    // const shots = [];
    // shots.push(new Shot(1, "0", "1", 2.33, 345.1, -89.91));
    // shots.push(new Shot(2, "1", "2", 13.12, 345.1, 89.91));
    // shots.push(new Shot(3, "2", "3", 33, 90, 89.91));
    // shots.push(new Shot(4, "3", "4", 0.1, 345.1, 12.91));
    // shots.push(new Shot(5, "4", "5", 0.1, 20, 89.91));
    // shots.push(new Shot(6, "4", "5", 0.1, 345.1, 29.91));
    // shots.push(new Shot(7, "4", "5", 0.1, -20, 89.91));
    // shots.push(new Shot(8, "4", "5", 0.1, 345.1, 89.91));


    // var tabledata = [
    //     {id:1, name:"Oli Bob", age:"12", col:"red", dob:""},
    //     {id:2, name:"Mary May", age:"1", col:"blue", dob:"14/05/1982"},
    //     {id:3, name:"Christine Lobowski", age:"42", col:"green", dob:"22/05/1982"},
    //     {id:4, name:"Brendon Philips", age:"125", col:"orange", dob:"01/08/1980"},
    //     {id:5, name:"Margret Marmajuke", age:"16", col:"yellow", dob:"31/01/1999"},
    // ];
    //validator to prevent values divisible by the provided divisor
    const P = /^[+-]?\d+([.,]\d+)?$/
    var noDivide = function (cell, value, parameters) {
        //cell - the cell component for the edited cell
        //value - the new input value of the cell
        //parameters - the parameters passed in with the validator
        return P.test(value); //don't allow values divisible by divisor ;
    }

    const customValidator = {
        type: noDivide
    };

    const cellClickHandler = function (e, cell) {
        datapanel.innerHTML = '';
        datapanel.style.display = 'none';
    };

    var table = new Tabulator("#datapanel", {
        height: 215, // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
        data: shots, //assign data to table
        layout: "fitColumns", //fit columns to width of table (optional)
        validationMode: "highlight",
        columns: [ //Define Table Columns
            { title: "Id", field: "id" },
            { title: "From", field: "from", editor: true, validator: ["required"] },
            { title: "To", field: "to", editor: true, validator: ["required"], cellClick: cellClickHandler },
            { title: "Length", field: "length", editor: true, validator: ["required", customValidator] },
            { title: "Azimuth", field: "azimuth", editor: true, validator: ["required", "min:-360", "max:360", customValidator] },
            { title: "Clino", field: "clino", editor: true, validator: ["required", customValidator] },
        ],
    });




    //trigger an alert message when the row is clicked
    //    table.on("rowClick", function(e, row){ 
    //        alert("Row " + row.getData().id + " Clicked!!!!");
    //    });

    // let patternForDecimals = "[\\+\\-]?\\d+([.,]\\d+)?"
    // let headerRow = '<th>id</th><th>from</th><th>to</th><th>length</th><th>azimuth</th><th>clino</th>';
    // let rows = shots.map((shot) => {
    //     return `<tr>
    //         <td>${shot.id}</td>
    //         <td><input type="text"value="${shot.from}"></td>
    //         <td><input type="text"value="${shot.to}"></td>
    //         <td><input type="text" pattern="${patternForDecimals}" value="${shot.length}"></td>
    //         <td><input type="text" pattern="${patternForDecimals}" value="${shot.azimuth}"></td>
    //         <td><input type="text" pattern="${patternForDecimals}" value="${shot.clino}"></td>
    //     </tr>`;
    // });
    // const table = `
    // <table>
    // 	<thead>
    // 		<tr>${headerRow}</tr>
    // 	<thead>
    // 	<tbody>
    // 		${rows}
    // 	<tbody>
    // <table>`;
    // datapanel.innerHTML = table;
}
