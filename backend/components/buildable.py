class Buildable:
    def __str__(self):
        cls_name = self.__class__.__name__
        args = []

        for k, v in self.__dict__.items():
            if isinstance(v, Buildable):
                args.append(f"{k}={v}")
            else:
                args.append(f"{k}={repr(v)}")

        return f"{cls_name}({', '.join(args)})"
