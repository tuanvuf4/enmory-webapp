import styles from './style'

export const NoResultInList = () => {
  const classes = styles()

  return [
    {
      value: 'noresult',
      label: (
        <div className={classes.optionItem} onClick={(e) => e.stopPropagation()}>
          <span>No result!</span>
          {/* <Button
            className={classNames(classes.btnAddNew)}
            icon={
              <PlusOutlined
                style={{
                  fontSize: token.fontSizeHeading4,
                }}
                color={token.colorPrimary}
              />
            }
            onClick={() => {
              dispatch(settingAction.toggleItemModal());
              dispatch(
                itemAction.updateSearchFormValue({
                  keyword: getValues('keyword'),
                }),
              );
            }}
          >
            Add
          </Button> */}
        </div>
      ),
    },
  ]
}
