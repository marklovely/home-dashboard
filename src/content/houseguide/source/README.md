# House guide source

Place the TrustedHousesitters / owner **house guide PDF** here as:

`house-guide.pdf`

The PDF is the source of truth. It is **not** served by the app. Run extraction to refresh structured content:

```bash
npm run guide:extract
```

That writes normalized copy into `guide-catalog.json` and images into `../media/`. Until the PDF is present, the catalog uses placeholder text from the legacy Markdown stubs.
