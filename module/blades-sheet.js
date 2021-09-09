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
    const item_type = $(event.currentTarget).data("itemType")
    const distinct = $(event.currentTarget).data("distinct")
    let input_type = "checkbox";

    if (typeof distinct !== "undefined") {
      input_type = "radio";
    }

    let items = await BladesHelpers.getAllItemsByType(item_type);
    items = items.map(i=> i.data);

    let html = `<div id="items-to-add">`;

    items.forEach(e => {
      let addition_price_load = ``;

      if (typeof e.data.load !== "undefined") {
        addition_price_load += `(${e.data.load})`
      } else if (typeof e.data.price !== "undefined") {
        addition_price_load += `(${e.data.price})`
      }

      html += `<input id="select-item-${e._id}" type="${input_type}" name="select_items" value="${e._id}">`;
      html += `<label class="flex-horizontal" for="select-item-${e._id}">`;
      html += `${game.i18n.localize(e.name)} ${addition_price_load} <i class="tooltip fas fa-question-circle"><span class="tooltiptext">${game.i18n.localize(e.data.description)}</span></i>`;
      html += `</label>`;
    });

    html += `</div>`;

    let options = {
      // width: "500"
    }

    let dialog = new Dialog({
      title: `${game.i18n.localize('Add')} ${item_type}`,
      content: html,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('Add'),
          callback: async () => await this.addItemsToSheet(item_type, $(document).find('#items-to-add'))
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Cancel'),
          callback: () => false
        }
      },
      default: "two"
    }, options);

    dialog.render(true);
  }

  /* -------------------------------------------- */

  async addItemsToSheet(item_type, el) {

    let items = await BladesHelpers.getAllItemsByType(item_type);
    items = items.map(i=> i.data);
    let items_to_add = [];

    el.find("input:checked").each(function() {
      items_to_add.push(items.find(e => e._id === $(this).val()));
    });

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