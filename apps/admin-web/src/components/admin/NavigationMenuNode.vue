<script setup lang="ts">
import type { Component } from 'vue'
import type { AdminMenuNode } from '../../lib/access-model'

defineOptions({
  name: 'NavigationMenuNode',
})

const props = defineProps<{
  item: AdminMenuNode
  iconMap: Record<string, Component>
}>()

const visibleChildren = props.item.children.filter(child => child.isEnabled && child.menuType !== 'button')
</script>

<template>
  <el-sub-menu v-if="visibleChildren.length > 0" :index="item.routePath ?? item.menuKey">
    <template #title>
      <el-icon v-if="item.icon && iconMap[item.icon]"><component :is="iconMap[item.icon]" /></el-icon>
      <span>{{ item.name }}</span>
    </template>

    <NavigationMenuNode
      v-for="child in visibleChildren"
      :key="child.id"
      :item="child"
      :icon-map="iconMap"
    />
  </el-sub-menu>

  <el-menu-item v-else :index="item.routePath ?? item.menuKey">
    <el-icon v-if="item.icon && iconMap[item.icon]"><component :is="iconMap[item.icon]" /></el-icon>
    <span>{{ item.name }}</span>
  </el-menu-item>
</template>