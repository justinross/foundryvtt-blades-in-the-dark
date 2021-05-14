
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

    //load up playbook options/data for playbook select 
    data.playbook_options = await game.packs.get("blades-in-the-dark.class").getIndex();
    data.playbook_select = this.prepIndexForHelper(data.playbook_options);

    if(data.data.playbook != ""){
      data.selected_playbook_full = await game.packs.get("blades-in-the-dark.class").getEntry(data.data.playbook);
      data.selected_playbook_name = data.selected_playbook_full.name;
      data.selected_playbook_description = data.selected_playbook_full.data.description;

      let playbook_abilities = data.items.filter(item => item.type == "ability" );

      //hide the playbook abbreviations for display
      data.playbook_abilities = playbook_abilities.map(item => {
        item.name = item.name.replace(/\([^)]*\)\s/, "");
        return item;
      });

      let playbook_items = data.items.filter(item => item.type == "item" && item.data.class == data.selected_playbook_name);

      //hide the playbook abbreviations for display
      data.playbook_items = playbook_items.map(item => {
        item.name = item.name.replace(/\([^)]*\)\s/, "")
        return item;
      });
      data.generic_items = data.items.filter(item => item.type == "item" && item.data.class == "");
    }

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
    html.find('.item-block .clickable-edit').click(ev => {
      ev.preventDefault();
      let itemId = ev.currentTarget.closest(".item-block").dataset.itemId;
      let item = this.actor.getOwnedItem(itemId);
      item.sheet.render(true);
    });

    html.find('.ability-block .clickable-edit').click(ev => {
      ev.preventDefault();
      let abilityId = ev.currentTarget.closest(".ability-block").dataset.abilityId;
      let ability = this.actor.getOwnedItem(abilityId);
      ability.sheet.render(true);
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

    html.find('.item-block .main-checkbox').change(ev => {
      let checkbox = ev.target;
      let itemId = checkbox.closest(".item-block").dataset.itemId;
      let item = this.actor.getOwnedItem(itemId);
      return item.update({data: {equipped : checkbox.checked}});
    });

    html.find('.item-block .child-checkbox').click(ev => {
      let checkbox = ev.target;
      let $main = $(checkbox).siblings(".main-checkbox");
      $main.trigger('click');
    });

    html.find('.ability-block .main-checkbox').change(ev => {
      let checkbox = ev.target;
      let abilityId = checkbox.closest(".ability-block").dataset.abilityId;
      let ability = this.actor.getOwnedItem(abilityId);
      return ability.update({data: {purchased : checkbox.checked}});
    });

    //this could probably be cleaner. Numbers instead of text would be fine, but not much easier, really. 
    html.find('.standing-toggle').click(ev => {
      let acquaintances = this.actor.data.data.acquaintances; 
      let acqId = ev.target.closest('.acquaintance').dataset.acquaintance;
      let clickedAcqIdx = acquaintances.findIndex(item => item._id == acqId);
      let clickedAcq = acquaintances[clickedAcqIdx];
      let oldStanding = clickedAcq.standing;
      let newStanding;
      switch(oldStanding){
        case "friend":
          newStanding = "neutral";
          break;
        case "rival":
          newStanding = "friend";
          break;
        case "neutral":
          newStanding = "rival";
          break;
      }
      clickedAcq.standing = newStanding;
      acquaintances.splice(clickedAcqIdx, 1, clickedAcq);
      this.actor.update({data: {acquaintances : acquaintances}});
    });

  }

  /* -------------------------------------------- */

}
