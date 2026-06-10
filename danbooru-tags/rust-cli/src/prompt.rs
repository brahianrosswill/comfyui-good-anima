use std::collections::{BTreeMap, HashMap};

use crate::types::{LayeredPrompt, PromptItem, ResultItem, SearchResults, Usage};

pub fn layered_for_prompt(results: &SearchResults) -> LayeredPrompt {
    let mut confirmed = BTreeMap::new();
    let mut candidates = BTreeMap::new();

    for (cat, items) in results {
        let limited = items
            .iter()
            .take(prompt_limit(cat, &layered_compact_limits()))
            .collect::<Vec<_>>();
        let (confirmed_items, candidate_items) = split_prompt_items(
            limited.as_slice(),
            cat,
            prompt_limit(cat, &confirmed_limits()),
        );
        if !confirmed_items.is_empty() {
            confirmed.insert(cat.clone(), confirmed_items);
        }
        if !candidate_items.is_empty() {
            candidates.insert(cat.clone(), candidate_items);
        }
    }

    let found = !(confirmed.is_empty() && candidates.is_empty());
    LayeredPrompt {
        found,
        confirmed_tags: confirmed,
        candidate_tags: candidates,
        usage: Usage {
            confirmed_tags: "可直接作为 Danbooru 锚点回填，但仍需按 Anima 标签顺序组装。"
                .to_string(),
            candidate_tags: "相关候选，先由模型按用户意图筛选，不要整组直接塞进 prompt。"
                .to_string(),
            nltags_hint: "CSV 没覆盖或组合关系不完整时，用英文自然语言补足，可写成短段落或多句，只要不与硬锚点冲突即可.".to_string(),
            empty_result: "found=false 表示本地 Anima CSV 没有可确认 tag，不要改用弱匹配冒充命中。"
                .to_string(),
        },
    }
}

pub fn prompt_item(item: &ResultItem) -> PromptItem {
    PromptItem {
        tag: item.tag.clone(),
        prompt_tag: item.prompt_tag.clone(),
        category: item.category.clone(),
        source_category: item.source_category.clone(),
        count: item.count,
        match_score: item.match_score,
        match_layer: item.match_layer.clone(),
    }
}

fn split_prompt_items(
    items: &[&ResultItem],
    cat: &str,
    confirmed_limit: usize,
) -> (Vec<PromptItem>, Vec<PromptItem>) {
    let mut confirmed = Vec::new();
    let mut candidates = Vec::new();
    for item in items {
        let prompt = prompt_item(item);
        if is_confirmed_item(item, cat) && confirmed.len() < confirmed_limit {
            confirmed.push(prompt);
        } else {
            candidates.push(prompt);
        }
    }
    (confirmed, candidates)
}

fn is_confirmed_item(item: &ResultItem, cat: &str) -> bool {
    if item.match_layer.as_deref() == Some("group_general_fallback") {
        return false;
    }
    if matches!(cat, "artists" | "characters" | "series" | "meta") {
        return true;
    }
    item.match_score.unwrap_or(i64::MAX) >= 60
}

fn layered_compact_limits() -> HashMap<&'static str, usize> {
    HashMap::from([
        ("artists", 5),
        ("characters", 5),
        ("series", 5),
        ("general", 24),
        ("meta", 8),
    ])
}

fn confirmed_limits() -> HashMap<&'static str, usize> {
    HashMap::from([
        ("artists", 1),
        ("characters", 1),
        ("series", 1),
        ("general", 8),
        ("meta", 4),
    ])
}

fn prompt_limit(cat: &str, limits: &HashMap<&'static str, usize>) -> usize {
    *limits
        .get(cat)
        .or_else(|| limits.get("general"))
        .unwrap_or(&20)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_prompt_split_rules() {
        let item = ResultItem {
            tag: "test".into(),
            prompt_tag: "test".into(),
            anima_tag: String::new(),
            category: "general".into(),
            source_category: "general".into(),
            count: 1,
            aliases: String::new(),
            aliases_short: String::new(),
            group: "general".into(),
            match_score: Some(61),
            match_layer: None,
        };
        let (confirmed, candidate) = split_prompt_items(&[&item], "general", 8);
        assert_eq!(confirmed.len(), 1);
        assert!(candidate.is_empty());
    }

    #[test]
    fn keeps_group_general_fallback_as_candidate() {
        let item = ResultItem {
            tag: "miko".into(),
            prompt_tag: "miko".into(),
            anima_tag: String::new(),
            category: "general".into(),
            source_category: "general".into(),
            count: 38378,
            aliases: String::new(),
            aliases_short: String::new(),
            group: "clothing".into(),
            match_score: Some(320),
            match_layer: Some("group_general_fallback".into()),
        };
        let (confirmed, candidate) = split_prompt_items(&[&item], "general", 8);
        assert!(confirmed.is_empty());
        assert_eq!(candidate.len(), 1);
    }
}
