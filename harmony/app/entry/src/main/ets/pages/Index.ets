@Entry
@Component
struct Index {
  build() {
    Column() {
      Text("AppCollection Harmony Build")
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
      Text("This module is used for HarmonyOS packaging.")
        .fontSize(14)
        .margin({ top: 8 })
    }
    .width("100%")
    .height("100%")
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor("#F1F5F9")
  }
}
