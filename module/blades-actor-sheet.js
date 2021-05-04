
import { BladesSheet } from "./blades-sheet.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {BladesSheet}
 */
export class BladesActorSheet extends BladesSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["blades-in-the-dark", "sheet", "actor"],
  	  template: "systems/blades-in-the-dark/templates/actor-sheet.html",
      width: 800,
      height: 1200,
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "playbook"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    var data = super.getData();

    // Calculate Load
    let loadout = 0;
    data.items.forEach(i => {loadout += (i.type === "item") ? parseInt(i.data.load) : 0});
    data.data.loadout = loadout;
    
    // Encumbrance Levels
    let load_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal","BITD.Heavy","BITD.Encumbered",
			"BITD.Encumbered","BITD.Encumbered","BITD.OverMax"];
    let mule_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal",
			"BITD.Heavy","BITD.Encumbered","BITD.OverMax"];
    let mule_present=0;
 
    //Sanity Check
    if (loadout < 0) {
      loadout = 0;
    }
    if (loadout > 10) {
      loadout = 10;
    }

    //look for Mule ability
    // @todo - fix translation.
    data.items.forEach(i => {
      if (i.type == "ability" && i.name == "(C) Mule") {
        mule_present = 1;
      }
    });

    //set encumbrance level
    if (mule_present) {
      data.data.load_level=mule_level[loadout];
    } else {
      data.data.load_level=load_level[loadout];   
    }
    
    data.load_levels = ["BITD.Light", "BITD.Normal", "BITD.Heavy"];

    //load up playbook options/data
    data.playbook_options = await game.packs.get("blades-in-the-dark.class").getIndex();
    data.playbook_select = this.prepIndexForHelper(data.playbook_options);
    data.selected_playbook_full = await game.packs.get("blades-in-the-dark.class").getEntry(data.data.playbook);
    data.selected_playbook_name = data.selected_playbook_full.name;
    data.selected_playbook_description = data.selected_playbook_full.data.description;

    //find skills for the selected playbook
    data.all_abilities = await game.packs.get("blades-in-the-dark.ability").getContent();
    data.playbook_abilities = data.all_abilities.filter(item => item.data.data.class == data.selected_playbook_name);

    //find items for the selected playbook
    data.all_items = await game.packs.get("blades-in-the-dark.item").getContent();
    data.playbook_items = data.all_items.filter(item => item.data.data.class == data.selected_playbook_name);
    data.generic_items = data.all_items.filter(item => item.data.data.class == "");

    return data;
  }

  prepIndexForHelper(index){
    let prepped = {};
    index.forEach(item => prepped[item._id] = item.name);
    return prepped;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find('.item-body').click(ev => {
      const element = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(element.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const element = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(element.data("itemId"));
      element.slideUp(200, () => this.render(false));
    });

    html.find('.toggle-allow-edit span').click(async (event) => {
      event.preventDefault();

      if(this.actor.getFlag('blades-in-the-dark', 'allow-edit')){
        await this.actor.unsetFlag('blades-in-the-dark', 'allow-edit');
      } else {
        await this.actor.setFlag('blades-in-the-dark', 'allow-edit', true);
    }
  });
  }

  /* -------------------------------------------- */

}
