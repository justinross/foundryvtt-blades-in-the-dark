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
      let classContent = await BladesHelpers.getSourcedItemsByType("class");
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

  async _preUpdate(changed, options, user){
    if(changed.data?.playbook && this.data.data.playbook && this.data.data.playbook != ""){
      changed = await this.handlePlaybookChange(changed);
    }
    return await super._preUpdate(changed, options, user);
  }

  /** @override */
  getRollData() {
    const data = super.getRollData();

    data.dice_amount = this.getAttributeDiceToThrow();

    return data;
  }

  async handlePlaybookChange(changed){
    let modifications = await this.modifiedFromPlaybookDefault(this.data.data.playbook);
    if(modifications){
      let abilitiesToKeepOptions = {name : "abilities", value:"none", options : {all: "Keep all Abilities", custom: "Keep added abilities", owned: "Keep owned abilities", ghost: `Keep "Ghost" abilities`, none: "Replace all"}};
      let acquaintancesToKeepOptions = {name : "acquaintances", value:"none", options : {all: "All contacts", friendsrivals: "Keep only friends and rivals", custom: "Keep any added contacts", both: "Keep added contacts and friends/rivals", none: "Replace all"}};
      let keepSkillPointsOptions = {name : "skillpoints", value:"reset", options : {keep: "Keep current skill points", reset: "Reset to new playbook starting skill points"}};
      let playbookItemsToKeepOptions = {name : "playbookitems", value: "none", options: {all: "Keep all playbook items", custom: "Keep added items", none: "Replace all"}};
      let selectTemplate = Handlebars.compile(`<select name="{{name}}" class="pb-migrate-options">{{selectOptions options selected=value}}</select>`)
      let dialogContent = `
          <p>Changes have been made to this character that would be overwritten by a playbook switch. Please select how you'd like to handle this data and click "Ok", or click "Cancel" to cancel this change.</p>
          <p>Note that this process only uses the Item, Ability, Playbook, and NPC compendia to decide what is "default". If you have created entities outside the relevant compendia and added them to your character, those items will be considered "custom" and removed unless you choose to save.</p>
          <h2>Changes to keep</h2>
          <div ${modifications.newAbilities || modifications.ownedAbilities ? "" : "hidden"}>
<!--          <div>-->
            <label>Abilities to keep</label>
            ${selectTemplate(abilitiesToKeepOptions)}
          </div>
          <div ${modifications.addedItems ? "" : "hidden"}>
<!--          <div>-->
            <label>Playbook Items</label>
            ${selectTemplate(playbookItemsToKeepOptions)}
          </div>
          <div ${modifications.skillsChanged ? "" : "hidden"}>
<!--          <div>-->
            <label>Skill Points</label>
            ${selectTemplate(keepSkillPointsOptions)}
          </div>
          <div ${modifications.acquaintanceList || modifications.relationships ? "" : "hidden"}>
<!--          <div>-->
            <label>Acquaintances</label>
            ${selectTemplate(acquaintancesToKeepOptions)}
          </div>
        `;

      let pbConfirm = new Dialog({
        title: `Change playbook to ${await BladesHelpers.getPlaybookName(changed.data.playbook)}?`,
        content: dialogContent,
        buttons:{
          ok:{
            icon: '<i class="fas fa-check"></i>',
            label: 'Ok',
            callback: (html)=> {
              let selects = html.find("select.pb-migrate-options");
              let selectedOptions = {};
              for (const select of $.makeArray(selects)) {
                selectedOptions[select.name] = select.value;
              };
              this.setUpNewPlaybook(selectedOptions, this.data.data.playbook, changed.data.playbook);
            }
          },
          cancel:{
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: ()=> {delete changed.data.playbook}
          }
        },
        close: () => {}
      });
      pbConfirm.render(true);
    }
    else{
      let selectedOptions = {
        "abilities": "none",
        "playbookitems": "none",
        "skillpoints": "reset",
        "acquaintances": "none"
      };
      this.setUpNewPlaybook(selectedOptions, this.data.data.playbook, changed.data.playbook);
    }
    return changed;
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
    text = "";
  
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
    var i;
  
    if ( s === "" ) {
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
   * @param {boolean} keep_owned_ghost_abilities
   * @returns {object} // the OwnedItems deleted
   */
  async deleteAbilities(what_to_keep, playbook_name){
    let current_abilities = this.items.filter(item => item.type == "ability");
    console.log("%cDeleting unnecessary abilities", "color: orange");
    let abilities_to_delete = [];
    // let playbook_name = await BladesHelpers.getPlaybookName(this.data.data.playbook);
    for(const ability of current_abilities){
      let keep = false;
      switch(what_to_keep){
        case "all":
          keep = true;
          break;
        case "owned":
          keep = ability.data.data.purchased;
          break;
        case "custom":
          keep = await BladesHelpers.checkIfCustom(playbook_name, ability);
          console.log(keep, ability.name);
          break;
        case "ghost":
          keep = ability.name.includes("Ghost") && ability.data.data.purchased
          break;
        case "none":
          keep = false;
          break;
      }
      if(!keep){
        abilities_to_delete.push(ability.id);
      }
    }
    let deleted;
    try{
      deleted = await this.deleteEmbeddedDocuments("Item", abilities_to_delete);
    }
    catch(error){
      console.log("Error deleting abilities: ", error);
    }
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
    let all_abilities = await BladesHelpers.getSourcedItemsByType("ability")
    // let existing_abilities = this.items.filter(item => item.type == "ability");
    let new_playbook_abilities = all_abilities.filter(ability => ability.data.data.class == playbook_name);

    let abilities_to_add = BladesHelpers.filterItemsForDuplicatesOnActor(new_playbook_abilities, "ability", this);
    let added = await this.createEmbeddedDocuments("Item", abilities_to_add.map(item => item.data), {noHook: true});
    return added;
  }

  /**
   * Deletes playbook-specific "item" OwnedItems from an actor
   *
   * @param {string} keep_custom_items
   * @returns {object} // the OwnedItems deleted
   */
  async deletePlaybookItems(what_to_keep, playbook_name){
    console.log("%cDeleting unnecessary playbook items", "color: orange");
    let current_playbook_items = this.items.filter(item => item.type == "item" && item.data.data.class != "");
    let items_to_delete = [];
    for(const item of current_playbook_items){
      let keep = false;
      switch(what_to_keep){
        case "all":
          keep = true;
          break;
        case "custom":
          keep = BladesHelpers.checkIfCustom(playbook_name, item);
          break;
        case "none":
          keep = false;
          break;
      }
      if(!keep){
        items_to_delete.push(item.id);
      }
    }

    let deleted = await this.deleteEmbeddedDocuments("Item", items_to_delete);
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
    let all_items = await BladesHelpers.getSourcedItemsByType("item");
    let new_playbook_items = all_items.filter(item => item.data.data.class == playbook_name);
    let items_to_add = BladesHelpers.filterItemsForDuplicatesOnActor(new_playbook_items, "item", this);
    let added = await this.createEmbeddedDocuments("Item", items_to_add.map(item => item.data), {noHook: true});
    // console.log("Added playbook items: ", added);
    return added;
  }

  /**
   * Checks for modifications that would be overwritten by a playbook change
   *
   * @returns {object} object of items that have been modified
   */
  async modifiedFromPlaybookDefault() {
    let skillsChanged = false;
    let newAbilities = false;
    let ownedAbilities = false;
    let relationships = false;
    let acquaintanceList = false;
    let addedItems = false;

    //get the original playbook
    let selected_playbook_source;
    if(this.data.data.playbook !== "" && this.data.data.playbook){
      // selected_playbook_source = await game.packs.get("blades-in-the-dark.class").getDocument(this.data.data.playbook);
      selected_playbook_source = await BladesHelpers.getItemByType("class", this.data.data.playbook);

      let startingAttributes = await BladesHelpers.getStartingAttributes(selected_playbook_source.name);
      let currentAttributes = this.data.data.attributes;
      for (const attribute in currentAttributes) {
        currentAttributes[attribute].exp = 0;
      }
      if(!isObjectEmpty(diffObject(currentAttributes, startingAttributes))){
        skillsChanged = true;
      }





      //check for added abilities
      let all_abilities = await BladesHelpers.getSourcedItemsByType("ability");
      if(all_abilities){
        let pb_abilities = all_abilities.filter(ab=> ab.data.data.class === selected_playbook_source.name);
        let my_abilities = this.items.filter(i => i.type === "ability");
        for (const ability of my_abilities) {
          if(!pb_abilities.some(ab=> ab.name === ability.name)){
            newAbilities = true;
          }
          //check for purchased abilities
          if(ability.data.data.purchased){
            ownedAbilities = true;
          }
        }
      }

      //check for non-default acquaintances
      let all_acquaintances = await BladesHelpers.getSourcedItemsByType("npc");
      if(all_acquaintances){
        let pb_acquaintances = all_acquaintances.filter(acq=>acq.data.data.associated_class === selected_playbook_source.name);
        let my_acquaintances = this.data.data.acquaintances;
        for (const my_acq of my_acquaintances) {
          if(!pb_acquaintances.some(acq=> acq.id === my_acq.id || acq.id === my_acq._id)){
            acquaintanceList = true;
          }
          //check for acquaintance relationships
          if(my_acq.standing !== "neutral"){
            relationships = true;
          }
        }
      }

      //check for added items
      let all_items = await BladesHelpers.getSourcedItemsByType("item");
      if(all_items){
        let pb_items = all_items.filter(i=> i.data.data.class === selected_playbook_source.name);
        let my_non_generic_items = this.items.filter(i=> i.type === "item" && i.data.data.class !== "");
        for (const myNGItem of my_non_generic_items) {
          if(!pb_items.some(i=> i.name ===  myNGItem.name)){
            addedItems = true;
          }
        }
      }
    }


    if(skillsChanged || newAbilities || ownedAbilities || relationships || acquaintanceList || addedItems){
      return {skillsChanged, newAbilities, ownedAbilities, relationships, acquaintanceList, addedItems};
    }
    else{
      return false;
    }
  }

  async setUpNewPlaybook(selectedOptions, old_playbook_id, new_playbook_id) {
    // await this.actor.update({data : {playbook : new_playbook_id}});
    let new_playbook_name = await BladesHelpers.getPlaybookName(new_playbook_id);
    if(old_playbook_id){
      let old_playbook_name = await BladesHelpers.getPlaybookName(old_playbook_id);
      await this.deleteAbilities(selectedOptions.abilities, old_playbook_name);
      await this.deleteAcquaintances(selectedOptions.acquaintances, old_playbook_name);
      await this.deletePlaybookItems(selectedOptions.playbookitems, old_playbook_name);
      await this.clearGenericItems();
    }
    switch(selectedOptions.skillpoints){
      case "keep":
        break;
      case "reset":
        await this.setToPlaybookBaseSkills(new_playbook_name);
        break;
    }
    await this.addPlaybookAbilities(new_playbook_name);
    await this.addPlaybookAcquaintances(new_playbook_name);
    await this.addPlaybookItems(new_playbook_name);
    await this.addGenericItems();
  }

  /**
   * Deletes generic "item" OwnedItems from an actor
   *
   * @param {boolean} keep_custom_items
   * @returns {object} // the OwnedItems deleted
   */
  async clearGenericItems(){
    console.log("%cDeleting generic items", "color: orange");
    let current_generic_items = this.items.filter(item => item.type == "item" && item.data.data.class == "");
    let items_to_delete = [];
    for(const item of current_generic_items){
      let keep = false;
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
    let all_items = await BladesHelpers.getSourcedItemsByType("item");
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
  async deleteAcquaintances(what_to_keep, playbook_name){
    console.log("%cDeleting unnecessary playbook acquaintances", "color: orange");
    let current_acquaintances = this.data.data.acquaintances;
    // let playbook_name = await BladesHelpers.getPlaybookName(this.data.data.playbook);
    let acquaintances_to_delete = [];
    for(const acq of current_acquaintances) {
      let keep = false;
      switch (what_to_keep) {
        case "all":
          keep = true;
          break;
        case "friendsrivals":
          keep = acq.standing != "neutral";
          break;
        case "custom":
          keep = BladesHelpers.checkIfCustom(playbook_name, acq);
          break;
        case "both":
          keep = BladesHelpers.checkIfCustom(playbook_name, acq) || acq.standing != "neutral";
          break;
        case "none":
          keep = false;
          break;
      }
      if(!keep){
        acquaintances_to_delete.push(acq);
      }
    }
    let acquaintances_to_keep = current_acquaintances.filter(currAcq => {
      return !acquaintances_to_delete.some(delAcq => {
        let match = delAcq.id === currAcq.id
        return match;
      });
    });
    let update = await this.update({data : {acquaintances : acquaintances_to_keep}});
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
    let all_npcs = await BladesHelpers.getSourcedItemsByType("npc");
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

  // adds an NPC to the character as an acquaintance of neutral standing
  async addAcquaintance(acq){
    let current_acquaintances = this.data.data.acquaintances;
    let acquaintance = {
      id : acq.id,
      name : acq.name,
      description_short : acq.data.description_short,
      standing: "neutral"
    };
    let unique_id =  !current_acquaintances.some((oldAcq) => {
      return oldAcq.id == acq.id;
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
    let new_acquaintances = current_acquaintances.filter(acq => acq._id !== acqId && acq.id !== acqId);
    await this.update({data: {acquaintances : new_acquaintances}});
  }

  // todo
  async setToPlaybookBaseSkills(new_playbook_name){
    const new_playbook_attributes = await BladesHelpers.getStartingAttributes(new_playbook_name);
    await this.update({data: {attributes : new_playbook_attributes}});
  }

  async resetMigTest(){
    this.data.data.playbook = "";
    // this.clearAbilities();
    // this.clearPlaybookItems();
    // this.clearAcquaintances();
    // this.clearGenericItems();
  }

  // todo
  // async addItemFromSource(item_id, source){
  //   if(source != "undefined"){
  //     let item = game.packs.get(source).getDocument(item_id);
  //   }
  //   console.log(item);
  // }

  /* -------------------------------------------- */

}