import styles from './style.module.scss'

export const NoResultInList = () => {
  return [
    {
      value: 'noresult',
      label: (
        <div className={styles.optionItem} onClick={(e) => e.stopPropagation()}>
          <span>No result!</span>
          {/* <Button
            className={classNames(styles.btnAddNew)}
            icon={
              <PlusOutlined
                style={{
                  fontSize: token.fontSizeHeading4,
                }}
                color={token.colorPrimary}
              />
            }
            onClick={() => {
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
