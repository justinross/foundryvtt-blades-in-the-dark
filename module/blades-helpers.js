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
      if ( ( ( i.name === item_data.name ) || ( should_be_distinct && has_double ) ) && !( allowed_types.includes( item_data.type ) ) && ( item_data._id !== i.id ) ) {
        dupe_list.push (i.id);
      }
    });

    return dupe_list;
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
  static async undoItemLogic(item_data, entity) {

    if ('logic' in item_data.data && item_data.data.logic !== '') {
      let logic = JSON.parse(item_data.data.logic)

      // Should be an array to support multiple expressions
      if (!Array.isArray(logic)) {
        logic = [logic];
      }

      if (logic) {
        let logic_update = { "_id": entity.id };
        var entity_data = entity.data;

        logic.forEach(expression => {
          // Different logic behav. dep on operator.
          switch (expression.operator) {

            // Subtract when removing.
            case "addition":
              foundry.utils.mergeObject(
                logic_update,
                {[expression.attribute]: Number(BladesHelpers.getNestedProperty(entity, expression.attribute)) - expression.value},
                {insertKeys: true}
              );
            break;

            // Change name back to default.
            case "attribute_change":
              // Get the array path to take data.
              let default_expression_attribute_path = expression.attribute + '_default';
              let default_name = default_expression_attribute_path.split(".").reduce((o, i) => o[i], entity_data);

              foundry.utils.mergeObject(
                logic_update,
                {[expression.attribute]: default_name},
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
  static async getAllItemsByType(item_type, game) {

    let list_of_items = [];
    let game_items = [];
    let compendium_items = [];

    game_items = game.items.filter(e => e.type === item_type).map(e => {return e.data});

    let pack = game.packs.find(e => e.metadata.name === item_type);
    let compendium_content = await pack.getDocuments();
    compendium_items = compendium_content.map(e => {return e.data});

    list_of_items = game_items.concat(compendium_items);

    return list_of_items;

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
        let attributes_to_return = empty_attributes;
        let all_playbooks = await game.packs.get("blades-in-the-dark.class").getDocuments();
        let selected_playbook_base_skills = all_playbooks.find(pb => pb.name == playbook_name).data.data.base_skills;
        for(const [key, value] of Object.entries(empty_attributes)){
          for(const [childKey, childValue] of Object.entries(value.skills)){
            if(selected_playbook_base_skills[childKey]){
              attributes_to_return[key].skills[childKey].value = selected_playbook_base_skills[childKey];
            }
          }
        }
        return attributes_to_return;
  }

  /**
   * Deletes all "ability" OwnedItems, with an exception for owned "Ghost" abilities, if specified
   *
   * @param {object} actor 
   * @param {bool} keep_owned_ghost_abilities 
   * @returns {object} // the OwnedItems deleted
   */
  static async clearAbilities(actor, keep_owned_ghost_abilities){
        let current_abilities = actor.items.filter(item => item.type == "ability");
        console.log("Deleting unnecessary abilities ...");
        let abilities_to_delete = [];
        current_abilities.forEach(async ability => {
          let keep = false;
          if(keep_owned_ghost_abilities){
            //delete all abilities except ones with "Ghost" in the name that are owned.
            keep = ability.name.includes("Ghost") && ability.data.data.purchased;
          }
          if(!keep){
            abilities_to_delete.push(ability._id);
          }
        });

        let deleted = await actor.deleteEmbeddedEntity("OwnedItem", abilities_to_delete, {noHook: true});
        // console.log("Deleted playbook abilities: ", deleted);
        return deleted;
  }

  /**
   * Adds playbook-specific "ability" OwnedItems to an actor
   *
   * @param {object} actor 
   * @param {string} playbook_name 
   * @returns {object} // the OwnedItems added
   */
  static async addPlaybookAbilities(actor, playbook_name){
      let all_abilities = await game.packs.get("blades-in-the-dark.ability").getDocuments();
      let new_playbook_abilities = all_abilities.filter(ability => ability.data.data.class == playbook_name);
      let added = await actor.createEmbeddedDocuments("Item", new_playbook_abilities.map(item => item.data), {noHook: true});
      return added;
  }

  /**
   * Deletes playbook-specific "item" OwnedItems from an actor
   *
   * @param {object} actor 
   * @param {string} keep_custom_items
   * @returns {object} // the OwnedItems deleted
   */
  static async clearPlaybookItems(actor, keep_custom_items = false){
        let current_playbook_items = actor.items.filter(item => item.type == "item" && item.data.data.class != "");
        console.log("Deleting unnecessary playbook items ...");
        let items_to_delete = [];
        current_playbook_items.forEach(async item => {
          let keep = false;
          if(keep_custom_items){
            keep = false;
          }
          if(!keep){
            items_to_delete.push(item._id);
          }
        });

        let deleted = await actor.deleteEmbeddedEntity("OwnedItem", items_to_delete, {noHook: true});
        // console.log("Deleted playbook items: ", deleted);
        return deleted;
  }

  /**
   * Adds playbook-specific "item" OwnedItems to an actor
   *
   * @param {object} actor 
   * @param {string} playbook_name 
   * @returns {object} // the OwnedItems added
   */
  static async addPlaybookItems(actor, playbook_name){
      console.log("Adding new playbook items");
      let all_items = await game.packs.get("blades-in-the-dark.item").getDocuments();
      let new_playbook_items = all_items.filter(item => item.data.data.class == playbook_name);
      let added = await actor.createEmbeddedDocuments("Item", new_playbook_items.map(item => item.data), {noHook: true});
      // console.log("Added playbook items: ", added);
      return added;
  }

  /**
   * Adds generic "item" Items to an actor
   *
   * @param {object} actor 
   * @returns {object} // the OwnedItems added
   */
  static async addGenericItems(actor){
      console.log("Adding new playbook items");
      let all_items = await game.packs.get("blades-in-the-dark.item").getDocuments();
      let new_items = all_items.filter(item => item.data.data.class == "");
      let added = await actor.createEmbeddedDocuments("Item", new_items.map(item => item.data), {noHook: true});
      // console.log("Added playbook items: ", added);
      return added;
  }

  /**
   * Deletes playbook-specific acquaintances from an actor
   *
   * @param {object} actor 
   * @param {string} keep_friends_and_rivals
   * @returns {object} // the deleted
   */
  static async clearAcquaintances(actor, keep_friends_and_rivals = false){
        let current_acquaintances = actor.data.data.acquaintances;
        console.log("Deleting unnecessary playbook acquaintances ...");
        let new_acquaintances_array = current_acquaintances.filter(acq => keep_friends_and_rivals && acq.standing != "neutral");
        let update = await actor.update({data : {acquaintances : new_acquaintances_array}});
        // console.log("Deleted: ", update);
        return update;
  }

  /**
   * Adds playbook-specific "item" OwnedItems to an actor
   *
   * @param {object} actor 
   * @param {string} playbook_name 
   * @returns {object} // the OwnedItems added
   */
  static async addPlaybookAcquaintances(actor, playbook_name){
      console.log("Adding new class acquaintances");
      //add class aquaintances
      let all_npcs = await game.packs.get("blades-in-the-dark.npc").getDocuments();
      let current_acquaintances = actor.data.data.acquaintances;
      let new_class_acquaintances = all_npcs.filter(obj => {
        let class_match = obj.data.data.associated_class == playbook_name
        let unique_id =  !current_acquaintances.some(acq => acq._id == obj._id);
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

      await actor.update({data: {acquaintances : current_acquaintances.concat(new_class_acquaintances)}});
  }
}
