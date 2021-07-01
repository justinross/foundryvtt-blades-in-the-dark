/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

export class BladesSheet extends ActorSheet {

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-add-popup").click(this._onItemAddClick.bind(this));
    html.find(".update-box").click(this._onUpdateBoxClick.bind(this));

    // This is a workaround until is being fixed in FoundryVTT.
    if ( this.options.submitOnChange ) {
      html.on("change", "textarea", this._onChangeInput.bind(this));  // Use delegated listener on the form
    }

    html.find(".roll-die-attribute").click(this._onRollAttributeDieClick.bind(this));

    html.find("[contenteditable]").blur(async (event) => {
      let value = event.target.textContent;
      let target = event.target.dataset.target;
      html.find('input[type="hidden"][data-input="'+target+'"]').val(value).submit();
    });

    html.find("input.radio-toggle, label.radio-toggle").click(e => e.preventDefault());
    html.find("input.radio-toggle, label.radio-toggle").mousedown(this._onRadioToggle.bind(this));
  }

  //allow for radio button toggling. Clicking an already-clicked radio button will deselect it, and select the next-lowest value. Only works with numeric values, of course.
  //this alleviates the need for the nullifying button
  _onRadioToggle(event){
    let type = event.target.tagName.toLowerCase();
    let target = event.target;
    if(type == "label"){
      let labelID = $(target).attr('for');
      target = $(`#${labelID}`).get(0);
      console.log("clicked a label")
    }
    if(target.checked){
      //find the next lowest-value input with the same name and click that one instead
      let name = target.name;
      let value = parseInt(target.value) - 1;
      $(`input[name="${name}"][value="${value}"]`).trigger('click');
    }
    else{
      //trigger the click on this one
      $(target).trigger('click');
    }

  }

  groupItems(arr, groupProperty){
	  let items_grouped = {};
	  arr.forEach((item) => {
	    if(getProperty(item, groupProperty) == ""){
	      if(!Array.isArray(items_grouped["Ungrouped"])){
	        items_grouped["Ungrouped"] = new Array();
        }
	      items_grouped["Ungrouped"].push(item);
      }
	    else{
        if(!Array.isArray(items_grouped[getProperty(item, groupProperty)])){
          items_grouped[getProperty(item, groupProperty)] = new Array();
        }
        items_grouped[getProperty(item, groupProperty)].push(item);
      }
    });
	  return items_grouped;
  }

  /* -------------------------------------------- */

  async _onItemAddClick(event) {
    event.preventDefault();
    const item_type = $(event.currentTarget).data("itemType");
    const distinct = $(event.currentTarget).data("distinct");
    const groupBy = $(event.currentTarget).data("groupBy");


    let input_type = "checkbox";

    if (typeof distinct !== "undefined") {
      input_type = "radio";
    }

    let items = await BladesHelpers.getAllItemsByType(item_type, game);
    // items.sort((a, b) => a.name > b.name ? 1 : -1);
    if(groupBy != null){
      items = this.groupItems(items, groupBy);
    }
    else{
      items = {...items};
    }

    let html = `<div id="items-to-add">`;
    html += `<label for="${this.actor.id}-add-item">Select items to add</label>`;
    html += `<select class="item-add-select" id="${this.actor.id}-add-item" name="select_items" multiple="multiple">`;

    for (const [key, item] of Object.entries(items)) {

      if(groupBy != null){
        html += `<optgroup label="${key}">`;
        item.forEach((i)=>{
          let addition_price_load = ``;

          if (typeof i.data.load !== "undefined") {
            addition_price_load += `${i.data.load}`
          } else if (typeof i.data.price !== "undefined") {
            addition_price_load += `${i.data.price}`
          }

          html += `<option value="${i._id}">${i.name} (${addition_price_load})</option>`;
        });
        html += `</optgroup>`;
      }
      else{
        let addition_price_load = ``;

        if (typeof item.data.load !== "undefined") {
          addition_price_load += `${item.data.load}`
        } else if (typeof item.data.price !== "undefined") {
          addition_price_load += `${item.data.price}`
        }
        html += `<option value=${item.id}>${item.name} (${addition_price_load})</option>`;
      }
    }

    html += `</select>`;
    html += `</div>`;

    let options = {
      // width: "500"
    }

    let $select;
    
    let dialog = new Dialog({
      title: `${game.i18n.localize('Add')} ${item_type}`,
      content: html,
      buttons: {
        add: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('Add'),
          callback: async () => {
            // await this.addItemsToSheet(item_type, $(document).find('#items-to-add'));
            await this.addItemsToSheet(item_type,items);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Cancel'),
          callback: () => false
        }
      },
      default: "two",
      render: (html)=>{

      }
    }, options);

    dialog.render(true);
  }
  
  /* -------------------------------------------- */

  async addItemsToSheet(item_type, selectedData) {
    let items = await BladesHelpers.getAllItemsByType(item_type, game);
    let items_to_add = [];

    await Item.create(items_to_add, {parent: this.document});
  }
  /* -------------------------------------------- */

  /**
   * Roll an Attribute die.
   * @param {*} event 
   */
  async _onRollAttributeDieClick(event) {

    const attribute_name = $(event.currentTarget).data("rollAttribute");
    this.actor.rollAttributePopup(attribute_name);

  }

  /* -------------------------------------------- */

  async _onUpdateBoxClick(event) {
    event.preventDefault();
    const item_id = $(event.currentTarget).data("item");
    var update_value = $(event.currentTarget).data("value");
      const update_type = $(event.currentTarget).data("utype");
      if ( update_value == undefined) {
      update_value = document.getElementById('fac-' + update_type + '-' + item_id).value;
    };
    var update;
    if ( update_type == "status" ) {
      update = {_id: item_id, data:{status:{value: update_value}}};
    }
    else if (update_type == "hold") {
      update = {_id: item_id, data:{hold:{value: update_value}}};
    } else {
      console.log("update attempted for type undefined in blades-sheet.js onUpdateBoxClick function");
      return;
    };

    await this.actor.updateEmbeddedDocuments("Item", [update]);
    
     
    }
  
  /* -------------------------------------------- */

}