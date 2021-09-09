export class BladesHelpers {

  /**
   * Identifies duplicate items by type and returns a array of item ids to remove
   *
   * @param {Object} item_data
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static removeDuplicatedItemType(item_data, actor) {
    let dupe_list = [];
    let distinct_types = ["crew_reputation", "class", "vice", "background", "heritage", "ability"];
    let allowed_types = ["item"];
    let should_be_distinct = distinct_types.includes(item_data.type);
    // If the Item has the exact same name - remove it from list.
    // Remove Duplicate items from the array.
    actor.items.forEach( i => {
      let has_double = (item_data.type === i.data.type);
      if ( ( ( i.name === item_data.name ) || ( should_be_distinct && has_double ) ) && !( allowed_types.includes( item_data.type ) ) && ( item_data.id !== i.id ) ) {
        dupe_list.push (i.id);
      }
    });

    return dupe_list;
  }

  static trimClassFromName(name){
    return name.replace(/\([^)]*\)\ /, "");
  }

  static capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Identifies duplicate items by type and returns a array of item ids to remove
   *
   * @param {Object} item_data
   * @param {Document} actor
   * @returns {Array}
   *
   */
  static filterItemsForDuplicatesOnActor(item_list, type, actor, check_trimmed_name = false) {
    let unduped_list = [];
    let distinct_types = ["crew_reputation", "class", "vice", "background", "heritage", "ability"];
    let allowed_types = ["item"];
    let existing_items = actor.items.filter(i=> i.type === type);
    let should_be_distinct = distinct_types.includes(type);

    // If the Item has the exact same name - remove it from list.
    // Remove Duplicate items from the array.
    unduped_list = item_list.filter(new_item => {
      if(check_trimmed_name){
        return !existing_items.some(existing => this.trimClassFromName(new_item.name) === this.trimClassFromName(existing.name));
      }
      else{
        return !existing_items.some(existing => new_item.name === existing.name);
      }
    })

    return unduped_list;
  }

  static groupItemsByClass(item_list, generic_last = true){
    let grouped_items = {};
    let generics = [];
    for (const item of item_list) {
      let itemclass= getProperty(item, "data.data.class");
      if(itemclass === ""){
        generics.push(item);
      }
      else{
        if(!(itemclass in grouped_items) || !Array.isArray(grouped_items[itemclass])){
          grouped_items[itemclass] = [];
        }
        grouped_items[itemclass].push(item);
      }
    }
    if(!generic_last && generics.length > 0){
      grouped_items["Generic"] = generics;
    }
    let sorted_grouped_items = Object.keys(grouped_items).sort().reduce(
      (obj, key) => {
        obj[key] = grouped_items[key];
        return obj;
      },
      {}
    );
    if(generic_last && generics.length > 0){
      sorted_grouped_items["Generic"] = generics;
    }
    return sorted_grouped_items;
  }

  /**
   * Add item modification if logic exists.
   * @param {Object} item_data
   * @param {Document} entity
   */
  static async callItemLogic(item_data, entity) {

    if ('logic' in item_data.data && item_data.data.logic !== '') {
      let logic = JSON.parse(item_data.data.logic);

      // Should be an array to support multiple expressions
      if (!Array.isArray(logic)) {
        logic = [logic];
      }

      if (logic) {
        let logic_update = { "_id": entity.id };
        logic.forEach(expression => {

          // Different logic behav. dep on operator.
          switch (expression.operator) {

            // Add when creating.
            case "addition":
              foundry.utils.mergeObject(
                logic_update,
                {[expression.attribute]: Number(BladesHelpers.getNestedProperty(entity, prefix + expression.attribute)) + expression.value},
                {insertKeys: true}
              );
            break;

            // Change name property.
            case "attribute_change":
              foundry.utils.mergeObject(
                logic_update,
                {[expression.attribute]: expression.value},
                {insertKeys: true}
              );
            break;

          }
        });
        await Actor.updateDocuments( logic_update );
      }

    }

  }

  /**
   * Undo Item modifications when item is removed.
   * @todo
   *  - Remove all items and then Add them back to
   *    sustain the logic mods
   * @param {Object} item_data
   * @param {Document} entity
   */
  // static async undoItemLogic(item_data, entity) {
  //
  //   if ('logic' in item_data.data && item_data.data.logic !== '') {
  //     let logic = JSON.parse(item_data.data.logic)
  //
  //     // Should be an array to support multiple expressions
  //     if (!Array.isArray(logic)) {
  //       logic = [logic];
  //     }
  //
  //     if (logic) {
  //       let logic_update = { "_id": entity.id };
  //       var entity_data = entity.data;
  //
  //       logic.forEach(expression => {
  //         // Different logic behav. dep on operator.
  //         switch (expression.operator) {
  //
  //           // Subtract when removing.
  //           case "addition":
  //             foundry.utils.mergeObject(
  //               logic_update,
  //               {[expression.attribute]: Number(BladesHelpers.getNestedProperty(entity, expression.attribute)) - expression.value},
  //               {insertKeys: true}
  //             );
  //           break;
  //
  //           // Change name back to default.
  //           case "attribute_change":
  //             // Get the array path to take data.
  //             let default_expression_attribute_path = expression.attribute + '_default';
  //             let default_name = default_expression_attribute_path.split(".").reduce((o, i) => o[i], entity_data);
  //
  //             foundry.utils.mergeObject(
  //               logic_update,
  //               {[expression.attribute]: default_name},
	// 		        	{insertKeys: true}
  //             );
  //
  //           break;
  //         }
  //       });
  //       await Actor.updateDocuments( logic_update );
  //     }
  //   }
  //
  // }

  /**
   * Get a nested dynamic attribute.
   * @param {Object} obj
   * @param {string} property
   */
  static getNestedProperty(obj, property) {
    return property.split('.').reduce((r, e) => {
        return r[e];
    }, obj);
  }


  /**
   * Add item functionality
   */
  static _addOwnedItem(event, actor) {

    event.preventDefault();
    const a = event.currentTarget;
    const item_type = a.dataset.itemType;

    let data = {
      name: randomID(),
      type: item_type
    };
    return actor.createEmbeddedDocuments("Item", [data]);
  }

  /**
   * Get the list of all available ingame items by Type.
   *
   * @param {string} item_type
   * @param {Object} game
   */
  static async getAllItemsByType(item_type) {

    let list_of_items = [];
    let game_items = [];
    let compendium_items = [];

    game_items = game.items.filter(e => e.type === item_type).map(e => {return e});

    let pack = game.packs.find(e => e.metadata.name === item_type);
    let compendium_content = await pack.getDocuments();
    compendium_items = compendium_content.map(e => {return e});

    list_of_items = game_items.concat(compendium_items);
    list_of_items.sort(function(a, b) {
      let nameA = a.data.name.toUpperCase();
      let nameB = b.data.name.toUpperCase();
      return nameA.localeCompare(nameB);
    });
    return list_of_items;

  }

  static async getSourcedItemsByType(item_type){
    const populateFromCompendia = game.settings.get('blades-in-the-dark','populateFromCompendia');
    const populateFromWorld = game.settings.get('blades-in-the-dark','populateFromWorld');
    let limited_items;

    if(populateFromCompendia && populateFromWorld){
      limited_items = await this.getAllItemsByType(item_type);
    }
    else if(populateFromCompendia && !populateFromWorld){
      limited_items = await game.packs.get("blades-in-the-dark." + item_type).getDocuments();
    }
    else if(!populateFromCompendia && populateFromWorld){
      if(item_type === "npc"){
        limited_items = game.actors.filter(actor=> actor.type === item_type);
      }
      else{
        limited_items = game.items.filter(item=>item.type === item_type);
      }
    }
    else{
      ui.notifications.error(`No playbook auto-population source has been selected in the system settings. Please choose at least one source.`, {permanent: true});
    }
    if(limited_items){
      limited_items.sort(function(a, b) {
        let nameA = a.name.toUpperCase();
        let nameB = b.name.toUpperCase();
        return nameA.localeCompare(nameB);
      });
    }

    return limited_items;

  }

  static async getItemByType(item_type, item_id){
    let game_items = await this.getAllItemsByType(item_type);
    let item = game_items.find(item => item.id === item_id);
    return item;
  }

  /* -------------------------------------------- */

  /**
   * Returns the label for attribute.
   *
   * @param {string} attribute_name
   * @returns {string}
   */
  static getAttributeLabel(attribute_name) {
        let attribute_labels = {};
        const attributes = game.system.model.Actor.character.attributes;

        for (const att_name in attributes) {
          attribute_labels[att_name] = attributes[att_name].label;
          for (const skill_name in attributes[att_name].skills) {
            attribute_labels[skill_name] = attributes[att_name].skills[skill_name].label;
          }

        }

        return attribute_labels[attribute_name];
  }
  
  /**
   * Returns true if the attribute is an action
   *
   * @param {string} attribute_name 
   * @returns {Boolean}
   */
  static isAttributeAction(attribute_name) {
        const attributes = game.system.model.Actor.character.attributes;
        
        return !(attribute_name in attributes);
  }

  /* -------------------------------------------- */

  /**
   * Return an object with base skills/actions for the given playbook name
   *
   * @param {string} playbook_name 
   * @returns {object}
   */
  static async getStartingAttributes(playbook_name) {
    let empty_attributes = game.system.model.Actor.character.attributes;
    //not sure what was getting linked rather than copied in empty_attributes, but the JSON hack below seems to fix the weirdness I was seeing
    let attributes_to_return = deepClone(empty_attributes);
    try{
      let all_playbooks = await BladesHelpers.getSourcedItemsByType("class");
      if(all_playbooks){
        let selected_playbook_base_skills = all_playbooks.find(pb => pb.name == playbook_name).data.data.base_skills;
        for(const [key, value] of Object.entries(empty_attributes)){
          for(const [childKey, childValue] of Object.entries(value.skills)){
            if(selected_playbook_base_skills[childKey]){
              attributes_to_return[key].skills[childKey].value = selected_playbook_base_skills[childKey].toString();
            }
          }
        }
      }
    }
    catch (e) {
      console.log("Error: ", e);
    }
    return attributes_to_return;
  }

  static async getPlaybookName(id){
    let playbook = await this.getItemByType("class", id);
    return playbook.name;
  }

  static async checkIfDefault(playbook_name, entity){
    let custom = false;
    switch(entity.type){
      case "ability":
        custom = playbook_name === entity.data.data.class;
        break;
      case "item":
        custom = playbook_name === entity.data.data.class;
        break;
      case "npc":
        custom = playbook_name === entity.data.data.associated_class;
        break;
    }
    return custom;
  }

  /**
   * Creates options for faction clocks.
   *
   * @param {int[]} sizes
   *  array of possible clock sizes
   * @param {int} default_size
   *  default clock size
   * @param {int} current_size
   *  current clock size
   * @returns {string}
   *  html-formatted option string
   */
  static createListOfClockSizes( sizes, default_size, current_size ) {

    let text = ``;

    sizes.forEach( size => {
      text += `<option value="${size}"`;
      if ( !( current_size ) && ( size === default_size ) ) {
        text += ` selected`;
      } else if ( size === current_size ) {
        text += ` selected`;
      }

      text += `>${size}</option>`;
    });

    return text;

  }

}
