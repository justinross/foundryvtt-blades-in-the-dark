import { bladesRoll } from "./blades-roll.js";
import { BladesHelpers } from "./blades-helpers.js";

/**
 * Extend the basic Actor
 * @extends {Actor}
 */
export class BladesActor extends Actor {

  /** @override */
  static async create(data, options={}) {

    data.token = data.token || {};

    // For Crew and Character set the Token to sync with charsheet.
    switch (data.type) {
      case 'character':
      case 'crew':
      case '\uD83D\uDD5B clock':
        data.token.actorLink = true;
        break;
    }

    return super.create(data, options);
  }

  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    console.log(data);
    let newData = {};
    // if it's a character and it doesn't have a playbook yet, pick a default class
    if(data.type === "character" && (data.data.playbook === "" || typeof(data.data.playbook === "undefined"))){
      let classIndex = await game.packs.get("blades-in-the-dark.class").getIndex();
      let classContent = await game.packs.get("blades-in-the-dark.class").getDocuments();
      //add default class and all the stuff that goes with it.
      let default_class = classContent[0];
      let attributes = await BladesHelpers.getStartingAttributes(default_class.name);
      newData.data = {};
      newData.data.playbook = default_class.id;
      newData.data.attributes = attributes;
      newData.data.trauma = {list : []};
      await this.update(newData);
    }
  }

  /** @override */
  getRollData() {
    const data = super.getRollData();

    data.dice_amount = this.getAttributeDiceToThrow();

    return data;
  }

  /* -------------------------------------------- */
  /**
   * Calculate Attribute Dice to throw.
   */
  getAttributeDiceToThrow() {

    // Calculate Dice to throw.
    let dice_amount = {};
    for (var attribute_name in this.data.data.attributes) {
      dice_amount[attribute_name] = 0;
      for (var skill_name in this.data.data.attributes[attribute_name].skills) {
        dice_amount[skill_name] = parseInt(this.data.data.attributes[attribute_name].skills[skill_name]['value'][0])

        // We add a +1d for every skill higher than 0.
        if (dice_amount[skill_name] > 0) {
          dice_amount[attribute_name]++;
        }
      }

    }

    return dice_amount;
  }

  /* -------------------------------------------- */

  rollAttributePopup(attribute_name) {

    // const roll = new Roll("1d20 + @abilities.wis.mod", actor.getRollData());
    let attribute_label = BladesHelpers.getAttributeLabel(attribute_name);

    var content = `
        <h2>${game.i18n.localize('BITD.Roll')} ${game.i18n.localize(attribute_label)}</h2>
        <form>
          <div class="form-group">
            <label>${game.i18n.localize('BITD.Modifier')}:</label>
            <select id="mod" name="mod">
              ${this.createListOfDiceMods(-3,+3,0)}
            </select>
          </div>`;
    if (BladesHelpers.isAttributeAction(attribute_name)) {
      content += `
            <div class="form-group">
              <label>${game.i18n.localize('BITD.Position')}:</label>
              <select id="pos" name="pos">
                <option value="controlled">${game.i18n.localize('BITD.PositionControlled')}</option>
                <option value="risky" selected>${game.i18n.localize('BITD.PositionRisky')}</option>
                <option value="desperate">${game.i18n.localize('BITD.PositionDesperate')}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${game.i18n.localize('BITD.Effect')}:</label>
              <select id="fx" name="fx">
                <option value="limited">${game.i18n.localize('BITD.EffectLimited')}</option>
                <option value="standard" selected>${game.i18n.localize('BITD.EffectStandard')}</option>
                <option value="great">${game.i18n.localize('BITD.EffectGreat')}</option>
              </select>
            </div>`;
    } else {
        content += `
            <input  id="pos" name="pos" type="hidden" value="">
            <input id="fx" name="fx" type="hidden" value="">`;
    }
    content += `
        </form>
      `;
    
    new Dialog({
      title: `${game.i18n.localize('BITD.Roll')} ${game.i18n.localize(attribute_label)}`,
      content: content,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize('BITD.Roll'),
          callback: async (html) => {
            let modifier = parseInt(html.find('[name="mod"]')[0].value);
            let position = html.find('[name="pos"]')[0].value;
            let effect = html.find('[name="fx"]')[0].value;
            await this.rollAttribute(attribute_name, modifier, position, effect);
          }
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize('Close'),
        },
      },
      default: "yes",
    }).render(true);

  }

  /* -------------------------------------------- */
  
  async rollAttribute(attribute_name = "", additional_dice_amount = 0, position, effect) {

    let dice_amount = 0;
    if (attribute_name !== "") {
      let roll_data = this.getRollData();
      dice_amount += roll_data.dice_amount[attribute_name];
    }
    else {
      dice_amount = 1;
    }
    dice_amount += additional_dice_amount;

    await bladesRoll(dice_amount, attribute_name, position, effect);
  }

  /* -------------------------------------------- */

  /**
   * Create <options> for available actions
   *  which can be performed.
   */
  createListOfActions() {
  
    let text, attribute, skill;
    let attributes = this.data.data.attributes;
  
    for ( attribute in attributes ) {
  
      var skills = attributes[attribute].skills;
  
      text += `<optgroup label="${attribute} Actions">`;
      text += `<option value="${attribute}">${attribute} (Resist)</option>`;
  
      for ( skill in skills ) {
        text += `<option value="${skill}">${skill}</option>`;
      }
  
      text += `</optgroup>`;
  
    }
  
    return text;
  
  }

  /* -------------------------------------------- */

  /**
   * Creates <options> modifiers for dice roll.
   *
   * @param {int} rs
   *  Min die modifier
   * @param {int} re 
   *  Max die modifier
   * @param {int} s
   *  Selected die
   */
  createListOfDiceMods(rs, re, s) {
  
    var text = ``;
    var i = 0;
  
    if ( s == "" ) {
      s = 0;
    }
  
    for ( i  = rs; i <= re; i++ ) {
      var plus = "";
      if ( i >= 0 ) { plus = "+" };
      text += `<option value="${i}"`;
      if ( i == s ) {
        text += ` selected`;
      }
      
      text += `>${plus}${i}d</option>`;
    }
  
    return text;
  
  }

  /**
   * Deletes all "ability" OwnedItems, with an exception for owned "Ghost" abilities, if specified
   *
   * @param {bool} keep_owned_ghost_abilities
   * @returns {object} // the OwnedItems deleted
   */
  async clearAbilities(keep_owned_ghost_abilities){
    let current_abilities = this.items.filter(item => item.type == "ability");
    console.log("%cDeleting unnecessary abilities", "color: orange");
    let abilities_to_delete = [];
    for(const ability of current_abilities){
      let keep = false;
      if(keep_owned_ghost_abilities){
        //delete all abilities except ones with "Ghost" in the name that are owned.
        keep = /* ability.name.includes("Ghost") && */ ability.data.data.purchased;
      }
      if(!keep){
        abilities_to_delete.push(ability.id);
      }
    };
    let deleted;
    try{
      // let testing = this.items.filter(item => item.type == "ability");
      deleted = await this.deleteEmbeddedDocuments("Item", abilities_to_delete);
    }
    catch(error){
      console.log("Error deleting abilities: ", error);
    }
    // console.log("Deleted playbook abilities: ", deleted);
    return deleted;
  }

  /**
   * Adds playbook-specific "ability" OwnedItems to an actor
   *
   * @param {string} playbook_name
   * @returns {object} // the OwnedItems added
   */
  async addPlaybookAbilities(playbook_name, mark_existing_as_owned){
    console.log("%cAdding new playbook abilities", "color: green");
    let all_abilities = await game.packs.get("blades-in-the-dark.ability").getDocuments();
    let new_playbook_abilities = all_abilities.filter(ability => ability.data.data.class == playbook_name);

    let abilities_to_add = BladesHelpers.filterItemsForDuplicatesOnActor(new_playbook_abilities, "ability", this);
    let added = await this.createEmbeddedDocuments("Item", abilities_to_add.map(item => item.data), {noHook: true});
    console.log("Added playbook abilities: ", added);
    return added;
  }

  /**
   * Deletes playbook-specific "item" OwnedItems from an actor
   *
   * @param {string} keep_custom_items
   * @returns {object} // the OwnedItems deleted
   */
  async clearPlaybookItems(keep_custom_items = false){
    console.log("%cDeleting unnecessary playbook items", "color: orange");
    let current_playbook_items = this.items.filter(item => item.type == "item" && item.data.data.class != "");
    let items_to_delete = [];
    for(const item of current_playbook_items){
      let keep = false;
      if(keep_custom_items){
        keep = false;
      }
      if(!keep){
        items_to_delete.push(item.id);
      }
    }

    let deleted = await this.deleteEmbeddedDocuments("Item", items_to_delete);
    console.log("Deleted playbook items: ", deleted);
    return deleted;
  }

  /**
   * Adds playbook-specific "item" OwnedItems to an actor
   *
   * @param {string} playbook_name
   * @returns {object} // the OwnedItems added
   */
  async addPlaybookItems(playbook_name){
    console.log("%cAdding new playbook items", "color: green");
    let all_items = await game.packs.get("blades-in-the-dark.item").getDocuments();
    let new_playbook_items = all_items.filter(item => item.data.data.class == playbook_name);
    let items_to_add = BladesHelpers.filterItemsForDuplicatesOnActor(new_playbook_items, "item", this);
    let added = await this.createEmbeddedDocuments("Item", items_to_add.map(item => item.data), {noHook: true});
    // console.log("Added playbook items: ", added);
    return added;
  }

  /**
   * Deletes generic "item" OwnedItems from an actor
   *
   * @param {boolean} keep_custom_items
   * @returns {object} // the OwnedItems deleted
   */
  async clearGenericItems(keep_custom_items = false){
    console.log("%cDeleting generic items", "color: orange");
    let current_generic_items = this.items.filter(item => item.type == "item" && item.data.data.class == "");
    let items_to_delete = [];
    //todo keep_custom_items doesn't do anything, it seems
    for(const item of current_generic_items){
      let keep = false;
      if(keep_custom_items){
        keep = false;
      }
      if(!keep){
        items_to_delete.push(item.id);
      }
    }

    let deleted = await this.deleteEmbeddedDocuments("Item", items_to_delete);
    console.log("Deleted generic items: ", deleted);
    return deleted;
  }

  /**
   * Adds generic "item" OwnedItems to an actor
   *
   * @returns {object} // the OwnedItems added
   */
  async addGenericItems(){
    console.log("%cAdding generic items", "color: green");
    let all_items = await game.packs.get("blades-in-the-dark.item").getDocuments();
    let new_items = all_items.filter(item => item.data.data.class == "");
    let items_to_add = BladesHelpers.filterItemsForDuplicatesOnActor(new_items, "item", this);
    let added = await this.createEmbeddedDocuments("Item", items_to_add.map(item => item.data), {noHook: true});
    // console.log("Added playbook items: ", added);
    return added;
  }

  /**
   * Deletes playbook-specific acquaintances from an actor
   *
   * @param {string} keep_friends_and_rivals
   * @returns {object} // the deleted
   */
  async clearAcquaintances(keep_friends_and_rivals = false){
    console.log("%cDeleting unnecessary playbook acquaintances", "color: orange");
    let current_acquaintances = this.data.data.acquaintances;
    let new_acquaintances_array = current_acquaintances.filter(acq => keep_friends_and_rivals && acq.standing != "neutral");
    let update = await this.update({data : {acquaintances : new_acquaintances_array}});
    // console.log("Deleted: ", update);
    return update;
  }

  /**
   * Adds playbook-specific "item" OwnedItems to an actor
   *
   * @param {string} playbook_name
   * @returns {object} // the OwnedItems added
   */
  async addPlaybookAcquaintances(playbook_name){
    console.log("%cAdding new playbook acquaintances", "color: green");
    //add class aquaintances
    let all_npcs = await game.packs.get("blades-in-the-dark.npc").getDocuments();
    let current_acquaintances = this.data.data.acquaintances;
    let new_class_acquaintances = all_npcs.filter(obj => {
      let class_match = obj.data.data.associated_class == playbook_name
      let unique_id =  !current_acquaintances.some(acq => {
        return acq._id == obj.id || acq.id == obj.id;
      });
      return class_match && unique_id;
    });
    new_class_acquaintances = new_class_acquaintances.map(acq => {
      return {
        id : acq.id,
        name : acq.name,
        description_short : acq.data.data.description_short,
        standing: "neutral"
      }
    });

    await this.update({data: {acquaintances : current_acquaintances.concat(new_class_acquaintances)}});
  }

  async addAcquaintance(acq){
    let current_acquaintances = this.data.data.acquaintances;
    let acquaintance = {
      _id : acq._id,
      name : acq.name,
      description_short : acq.data.description_short,
      standing: "neutral"
    };
    let unique_id =  !current_acquaintances.some((oldAcq) => {
      return oldAcq._id == acq.id;
    });
    if(unique_id){
      await this.update({data: {acquaintances : current_acquaintances.concat(acquaintance)}});
    }
    else{
      ui.notifications.info("The dropped NPC is already an acquaintance of this character.");
    }
  }

  async removeAcquaintance(acqId){
    let current_acquaintances = this.data.data.acquaintances;
    let new_acquaintances = current_acquaintances.filter(acq => acq._id != acqId);
    await this.update({data: {acquaintances : new_acquaintances}});
  }

  /* -------------------------------------------- */

}